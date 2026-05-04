import { ConfigService } from '@nestjs/config';
import {
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';

import { ErpAuthService } from '../src/erp/auth/erp-auth.service';

describe('ErpAuthService internal login', () => {
  const fixedNow = new Date('2026-05-03T12:00:00.000Z');

  const buildPrismaService = () => ({
    erpSystemUser: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    erpSystemRole: {
      upsert: jest.fn(),
    },
    erpSystemUserRole: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    erpSystemAuditLog: {
      create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    },
  });

  const buildService = (prismaService: ReturnType<typeof buildPrismaService>) => {
    const service = new ErpAuthService(
      new ConfigService({
        ERP_AUTH_SECRET: 'test-secret',
        ERP_AUTH_SESSION_TTL_SECONDS: '3600',
      }),
      prismaService as never,
    );
    service.setClockForTesting(() => fixedNow);
    return service;
  };

  it('logs in an active internal user, returns a signed cookie, and records audit', async () => {
    const prismaService = buildPrismaService();
    const service = buildService(prismaService);
    const passwordHash = service.hashPassword('correct-password');
    prismaService.erpSystemUser.findUnique.mockResolvedValue({
      id: 'user-1',
      username: 'admin',
      displayName: 'Admin',
      email: 'admin@example.com',
      active: true,
      passwordHash,
      roles: [
        {
          role: {
            code: 'ADMIN',
            name: 'Administrator',
            permissions: ['system.write', 'orders.read'],
          },
        },
      ],
      createdAt: fixedNow,
      updatedAt: fixedNow,
    });
    prismaService.erpSystemUser.update.mockResolvedValue({ id: 'user-1' });

    const result = await service.login(
      { username: 'admin', password: 'correct-password' },
      { ipAddress: '127.0.0.1', userAgent: 'jest' },
    );

    expect(result.cookie).toContain('hami_erp_session=');
    expect(result.cookie).toContain('HttpOnly');
    expect(result.cookie).toContain('SameSite=Lax');
    expect(result.data).toMatchObject({
      status: 'ok',
      type: 'account',
      currentAuthority: 'admin',
      currentUser: {
        id: 'user-1',
        name: 'Admin',
        username: 'admin',
        access: 'admin',
      },
    });
    expect(prismaService.erpSystemUser.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { lastLoginAt: fixedNow },
    });
    expect(prismaService.erpSystemAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: 'user-1',
        actorName: 'admin',
        module: 'auth',
        action: 'LOGIN',
        status: 'SUCCESS',
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
      }),
    });
  });

  it('rejects inactive users and does not create a session cookie', async () => {
    const prismaService = buildPrismaService();
    const service = buildService(prismaService);
    prismaService.erpSystemUser.findUnique.mockResolvedValue({
      id: 'user-1',
      username: 'staff',
      active: false,
      passwordHash: service.hashPassword('correct-password'),
      roles: [],
    });

    await expect(
      service.login({ username: 'staff', password: 'correct-password' }, {}),
    ).rejects.toThrow(UnauthorizedException);
    expect(prismaService.erpSystemUser.update).not.toHaveBeenCalled();
    expect(prismaService.erpSystemAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorName: 'staff',
        module: 'auth',
        action: 'LOGIN',
        status: 'FAILED',
      }),
    });
  });

  it('resolves the current user from a valid session token and clears logout cookie', async () => {
    const prismaService = buildPrismaService();
    const service = buildService(prismaService);
    prismaService.erpSystemUser.findUnique.mockResolvedValue({
      id: 'user-1',
      username: 'manager',
      displayName: 'Manager',
      email: 'manager@example.com',
      active: true,
      roles: [
        {
          role: {
            code: 'MANAGER',
            name: 'Manager',
            permissions: ['orders.read'],
          },
        },
      ],
      createdAt: fixedNow,
      updatedAt: fixedNow,
    });

    const cookie = service.createSessionCookie({
      id: 'user-1',
      username: 'manager',
      roleCodes: ['MANAGER'],
    });
    const token = cookie.match(/hami_erp_session=([^;]+)/)?.[1];

    await expect(service.me(token)).resolves.toMatchObject({
      success: true,
      data: {
        id: 'user-1',
        username: 'manager',
        name: 'Manager',
        access: 'manager',
      },
    });
    expect(service.createLogoutCookie()).toContain('Max-Age=0');
  });

  it('fails module startup when the session secret is missing', async () => {
    const service = new ErpAuthService(
      { get: jest.fn().mockReturnValue(undefined) } as never,
      buildPrismaService() as never,
    );
    service.setClockForTesting(() => fixedNow);

    await expect(service.onModuleInit()).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
