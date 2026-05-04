import {
  Injectable,
  InternalServerErrorException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

import { PrismaService } from '../../infra/database/prisma.service';
import { ErpLoginDto } from './dto/erp-auth.dto';

const SESSION_COOKIE_NAME = 'hami_erp_session';
const PASSWORD_PREFIX = 'scrypt';

type AuthMeta = {
  ipAddress?: string;
  userAgent?: string;
};

type SessionPayload = {
  sub: string;
  username: string;
  roles: string[];
  iat: number;
  exp: number;
};

type UserWithRoles = {
  id: string;
  username: string;
  displayName: string | null;
  email: string | null;
  active: boolean;
  passwordHash?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  roles: Array<{
    role: {
      code: string;
      name: string;
      permissions: Prisma.JsonValue;
    };
  }>;
};

@Injectable()
export class ErpAuthService implements OnModuleInit {
  private now: () => Date = () => new Date();

  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {}

  setClockForTesting(now: () => Date) {
    this.now = now;
  }

  async onModuleInit() {
    this.authSecret();
    await this.ensureDefaultAdmin();
  }

  async login(payload: ErpLoginDto, meta: AuthMeta) {
    const username = payload.username.trim();
    const user = await this.prismaService.erpSystemUser.findUnique({
      where: { username },
      include: { roles: { include: { role: true } } },
    });

    if (!user?.active || !user.passwordHash || !this.verifyPassword(payload.password, user.passwordHash)) {
      await this.recordAudit({
        actorId: user?.id,
        actorName: username,
        action: 'LOGIN',
        status: 'FAILED',
        message: user?.active === false ? 'Inactive user login blocked.' : 'Invalid login credentials.',
        meta,
      });
      throw new UnauthorizedException('Invalid username or password.');
    }

    await this.prismaService.erpSystemUser.update({
      where: { id: user.id },
      data: { lastLoginAt: this.now() },
    });
    await this.recordAudit({
      actorId: user.id,
      actorName: user.username,
      action: 'LOGIN',
      status: 'SUCCESS',
      message: `User ${user.username} logged in.`,
      meta,
    });

    const currentUser = this.toCurrentUser(user);
    return {
      cookie: this.createSessionCookie({
        id: user.id,
        username: user.username,
        roleCodes: currentUser.roles.map((role) => role.code),
      }),
      data: {
        status: 'ok',
        type: 'account',
        currentAuthority: currentUser.access,
        currentUser,
      },
    };
  }

  async me(token?: string) {
    const session = this.verifySessionToken(token);
    const user = await this.prismaService.erpSystemUser.findUnique({
      where: { id: session.sub },
      include: { roles: { include: { role: true } } },
    });

    if (!user?.active) {
      throw new UnauthorizedException('ERP session is no longer active.');
    }

    return {
      success: true,
      data: this.toCurrentUser(user),
    };
  }

  createSessionCookie(input: { id: string; username: string; roleCodes: string[] }) {
    const nowSeconds = Math.floor(this.now().getTime() / 1000);
    const ttlSeconds = this.sessionTtlSeconds();
    const payload: SessionPayload = {
      sub: input.id,
      username: input.username,
      roles: input.roleCodes,
      iat: nowSeconds,
      exp: nowSeconds + ttlSeconds,
    };
    const token = this.signPayload(payload);
    return this.serializeCookie(token, ttlSeconds);
  }

  createLogoutCookie() {
    return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
  }

  extractToken(cookieHeader?: string) {
    if (!cookieHeader) return undefined;
    const cookies = cookieHeader.split(';').map((item) => item.trim());
    const cookie = cookies.find((item) => item.startsWith(`${SESSION_COOKIE_NAME}=`));
    return cookie?.slice(SESSION_COOKIE_NAME.length + 1);
  }

  hashPassword(password: string) {
    const salt = randomBytes(16).toString('base64url');
    const hash = scryptSync(password, salt, 64).toString('base64url');
    return `${PASSWORD_PREFIX}:${salt}:${hash}`;
  }

  verifyPassword(password: string, storedHash: string) {
    const [prefix, salt, hash] = storedHash.split(':');
    if (prefix !== PASSWORD_PREFIX || !salt || !hash) return false;
    const candidate = scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, 'base64url');
    return expected.length === candidate.length && timingSafeEqual(expected, candidate);
  }

  private async ensureDefaultAdmin() {
    const username = this.configService.get<string>('ERP_ADMIN_USERNAME');
    const password = this.configService.get<string>('ERP_ADMIN_PASSWORD');
    if (!username || !password) return;

    const role = await this.prismaService.erpSystemRole.upsert({
      where: { code: 'ADMIN' },
      update: {
        name: 'Administrator',
        permissions: this.toJson(['system.write', 'orders.read', 'orders.fulfillment']),
        active: true,
      },
      create: {
        code: 'ADMIN',
        name: 'Administrator',
        permissions: this.toJson(['system.write', 'orders.read', 'orders.fulfillment']),
        active: true,
      },
    });

    let user = await this.prismaService.erpSystemUser.findUnique({
      where: { username },
      include: { roles: { include: { role: true } } },
    });
    if (!user) {
      user = await this.prismaService.erpSystemUser.create({
        data: {
          username,
          displayName: this.configService.get<string>('ERP_ADMIN_DISPLAY_NAME') ?? username,
          email: this.configService.get<string>('ERP_ADMIN_EMAIL'),
          passwordHash: this.hashPassword(password),
          passwordChangedAt: this.now(),
          active: true,
        },
        include: { roles: { include: { role: true } } },
      });
    }

    const existingRole = await this.prismaService.erpSystemUserRole.findFirst({
      where: { userId: user.id, roleId: role.id },
    });
    if (!existingRole) {
      await this.prismaService.erpSystemUserRole.create({
        data: { userId: user.id, roleId: role.id },
      });
    }
  }

  private verifySessionToken(token?: string): SessionPayload {
    if (!token) {
      throw new UnauthorizedException('Missing ERP session.');
    }
    const [encodedPayload, signature] = token.split('.');
    if (!encodedPayload || !signature) {
      throw new UnauthorizedException('Invalid ERP session.');
    }
    const expectedSignature = this.sign(encodedPayload);
    const expected = Buffer.from(expectedSignature);
    const actual = Buffer.from(signature);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      throw new UnauthorizedException('Invalid ERP session.');
    }

    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as SessionPayload;
    if (!payload.sub || payload.exp <= Math.floor(this.now().getTime() / 1000)) {
      throw new UnauthorizedException('Expired ERP session.');
    }
    return payload;
  }

  private signPayload(payload: SessionPayload) {
    const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    return `${encodedPayload}.${this.sign(encodedPayload)}`;
  }

  private sign(value: string) {
    return createHmac('sha256', this.authSecret()).update(value).digest('base64url');
  }

  private serializeCookie(token: string, ttlSeconds: number) {
    const secure = this.configService.get<string>('ERP_AUTH_COOKIE_SECURE') === 'true' ? '; Secure' : '';
    return `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ttlSeconds}${secure}`;
  }

  private sessionTtlSeconds() {
    const raw = Number(this.configService.get<string>('ERP_AUTH_SESSION_TTL_SECONDS', '43200'));
    return Number.isFinite(raw) && raw > 0 ? raw : 43200;
  }

  private authSecret() {
    const secret = this.configService.get<string>('ERP_AUTH_SECRET')?.trim();
    if (!secret) {
      throw new InternalServerErrorException(
        'Missing ERP_AUTH_SECRET configuration.',
      );
    }
    return secret;
  }

  private toCurrentUser(user: UserWithRoles) {
    const roles = user.roles.map(({ role }) => ({
      code: role.code,
      name: role.name,
      permissions: Array.isArray(role.permissions) ? role.permissions.map(String) : [],
    }));
    const access = roles.some((role) => role.code === 'ADMIN')
      ? 'admin'
      : roles.some((role) => role.code === 'MANAGER')
        ? 'manager'
        : 'staff';

    return {
      id: user.id,
      username: user.username,
      name: user.displayName ?? user.username,
      displayName: user.displayName,
      email: user.email,
      avatar: undefined,
      access,
      roles,
    };
  }

  private async recordAudit(input: {
    actorId?: string;
    actorName?: string;
    action: string;
    status: string;
    message?: string;
    meta?: AuthMeta;
  }) {
    await this.prismaService.erpSystemAuditLog.create({
      data: {
        actorId: input.actorId,
        actorName: input.actorName,
        module: 'auth',
        action: input.action,
        status: input.status,
        message: input.message,
        ipAddress: input.meta?.ipAddress,
        userAgent: input.meta?.userAgent,
      },
    });
  }

  private toJson(input: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(input)) as Prisma.InputJsonValue;
  }
}
