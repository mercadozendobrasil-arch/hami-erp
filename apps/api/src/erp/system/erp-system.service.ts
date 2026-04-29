import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from 'src/infra/database/prisma.service';

import {
  ErpAuditLogQueryDto,
  ErpSystemPageQueryDto,
  ErpTaskLogQueryDto,
  SaveErpRoleDto,
  SaveErpUserDto,
} from './dto/erp-system.dto';

const ERP_PERMISSIONS = [
  'orders.read',
  'orders.fulfillment',
  'orders.exceptions',
  'products.read',
  'products.write',
  'inventory.read',
  'inventory.adjust',
  'purchase.read',
  'purchase.write',
  'finance.read',
  'system.read',
  'system.write',
];

@Injectable()
export class ErpSystemService {
  constructor(private readonly prismaService: PrismaService) {}

  listPermissions() {
    return {
      success: true,
      data: ERP_PERMISSIONS.map((code) => ({
        code,
        module: code.split('.')[0],
        action: code.split('.')[1],
      })),
      total: ERP_PERMISSIONS.length,
    };
  }

  async listRoles(query: ErpSystemPageQueryDto) {
    const { current, pageSize } = this.page(query);
    const where: Prisma.ErpSystemRoleWhereInput = {
      ...(query.keyword
        ? {
            OR: [
              { code: { contains: query.keyword, mode: 'insensitive' } },
              { name: { contains: query.keyword, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, data] = await this.prismaService.$transaction([
      this.prismaService.erpSystemRole.count({ where }),
      this.prismaService.erpSystemRole.findMany({
        where,
        include: { users: true },
        orderBy: [{ active: 'desc' }, { name: 'asc' }],
        skip: (current - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      success: true,
      data: data.map((role) => ({
        ...role,
        permissions: this.asStringArray(role.permissions),
        userCount: role.users.length,
      })),
      total,
      current,
      pageSize,
    };
  }

  async saveRole(payload: SaveErpRoleDto) {
    const role = await this.prismaService.erpSystemRole.upsert({
      where: { code: payload.code },
      update: {
        name: payload.name,
        description: payload.description,
        permissions: this.toJson(payload.permissions),
        active: payload.active ?? true,
      },
      create: {
        code: payload.code,
        name: payload.name,
        description: payload.description,
        permissions: this.toJson(payload.permissions),
        active: payload.active ?? true,
      },
    });

    await this.recordAudit({
      module: 'system',
      action: 'SAVE_ROLE',
      status: 'SUCCESS',
      resourceId: role.id,
      message: `Saved role ${role.code}`,
      request: payload,
    });

    return {
      success: true,
      data: {
        ...role,
        permissions: this.asStringArray(role.permissions),
      },
    };
  }

  async listUsers(query: ErpSystemPageQueryDto) {
    const { current, pageSize } = this.page(query);
    const where: Prisma.ErpSystemUserWhereInput = {
      ...(query.keyword
        ? {
            OR: [
              { username: { contains: query.keyword, mode: 'insensitive' } },
              { displayName: { contains: query.keyword, mode: 'insensitive' } },
              { email: { contains: query.keyword, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, data] = await this.prismaService.$transaction([
      this.prismaService.erpSystemUser.count({ where }),
      this.prismaService.erpSystemUser.findMany({
        where,
        include: { roles: { include: { role: true } } },
        orderBy: [{ active: 'desc' }, { username: 'asc' }],
        skip: (current - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      success: true,
      data: data.map((user) => ({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        active: user.active,
        roles: user.roles.map(({ role }) => ({
          id: role.id,
          code: role.code,
          name: role.name,
        })),
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      })),
      total,
      current,
      pageSize,
    };
  }

  async saveUser(payload: SaveErpUserDto) {
    const user = await this.prismaService.erpSystemUser.upsert({
      where: { username: payload.username },
      update: {
        displayName: payload.displayName,
        email: payload.email,
        active: payload.active ?? true,
      },
      create: {
        username: payload.username,
        displayName: payload.displayName,
        email: payload.email,
        active: payload.active ?? true,
      },
    });

    if (payload.roleIds) {
      await this.prismaService.$transaction([
        this.prismaService.erpSystemUserRole.deleteMany({
          where: { userId: user.id },
        }),
        ...payload.roleIds.map((roleId) =>
          this.prismaService.erpSystemUserRole.create({
            data: { userId: user.id, roleId },
          }),
        ),
      ]);
    }

    await this.recordAudit({
      module: 'system',
      action: 'SAVE_USER',
      status: 'SUCCESS',
      resourceId: user.id,
      message: `Saved user ${user.username}`,
      request: payload,
    });

    return { success: true, data: user };
  }

  async listOperationLogs(query: ErpAuditLogQueryDto) {
    const { current, pageSize } = this.page(query);
    const operationWhere: Prisma.ErpOrderOperationLogWhereInput = {
      ...(query.keyword
        ? {
            OR: [
              { action: { contains: query.keyword, mode: 'insensitive' } },
              { message: { contains: query.keyword, mode: 'insensitive' } },
              { orderSn: { contains: query.keyword, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.action ? { action: { contains: query.action, mode: 'insensitive' } } : {}),
    };
    const auditWhere: Prisma.ErpSystemAuditLogWhereInput = {
      ...(query.keyword
        ? {
            OR: [
              { action: { contains: query.keyword, mode: 'insensitive' } },
              { message: { contains: query.keyword, mode: 'insensitive' } },
              { resourceId: { contains: query.keyword, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.module ? { module: query.module } : {}),
      ...(query.action ? { action: { contains: query.action, mode: 'insensitive' } } : {}),
    };

    const [orderLogs, auditLogs] = await this.prismaService.$transaction([
      this.prismaService.erpOrderOperationLog.findMany({
        where: operationWhere,
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
      this.prismaService.erpSystemAuditLog.findMany({
        where: auditWhere,
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    ]);

    const merged = [
      ...orderLogs.map((item) => ({
        id: `order:${item.id}`,
        module: 'orders',
        action: item.action,
        status: item.status,
        resourceId: item.orderSn,
        shopId: item.shopId,
        message: item.message ?? item.errorMessage,
        operatorId: item.operatorId,
        createdAt: item.createdAt.toISOString(),
      })),
      ...auditLogs.map((item) => ({
        id: `system:${item.id}`,
        module: item.module,
        action: item.action,
        status: item.status,
        resourceId: item.resourceId,
        message: item.message ?? item.errorMessage,
        operatorId: item.actorId,
        actorName: item.actorName,
        createdAt: item.createdAt.toISOString(),
      })),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const start = (current - 1) * pageSize;
    return {
      success: true,
      data: merged.slice(start, start + pageSize),
      total: merged.length,
      current,
      pageSize,
    };
  }

  async listTaskLogs(query: ErpTaskLogQueryDto) {
    const { current, pageSize } = this.page(query);
    const where: Prisma.JobRecordWhereInput = {
      ...(query.queueName
        ? { queueName: { contains: query.queueName, mode: 'insensitive' } }
        : {}),
      ...(query.status ? { status: query.status as never } : {}),
      ...(query.keyword
        ? {
            OR: [
              { id: { contains: query.keyword, mode: 'insensitive' } },
              { queueName: { contains: query.keyword, mode: 'insensitive' } },
              { jobName: { contains: query.keyword, mode: 'insensitive' } },
              { errorMessage: { contains: query.keyword, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, data] = await this.prismaService.$transaction([
      this.prismaService.jobRecord.count({ where }),
      this.prismaService.jobRecord.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (current - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      success: true,
      data: data.map((job) => ({
        id: job.id,
        queueName: job.queueName,
        jobName: job.jobName,
        status: job.status,
        errorMessage: job.errorMessage,
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
        processedAt: job.processedAt?.toISOString(),
      })),
      total,
      current,
      pageSize,
    };
  }

  private async recordAudit(input: {
    module: string;
    action: string;
    status: string;
    resourceId?: string;
    message?: string;
    request?: unknown;
  }) {
    await this.prismaService.erpSystemAuditLog.create({
      data: {
        module: input.module,
        action: input.action,
        status: input.status,
        resourceId: input.resourceId,
        message: input.message,
        request: input.request ? this.toJson(input.request) : undefined,
      },
    });
  }

  private page(query: ErpSystemPageQueryDto) {
    return {
      current: query.current ?? 1,
      pageSize: query.pageSize ?? 20,
    };
  }

  private asStringArray(value: Prisma.JsonValue) {
    return Array.isArray(value) ? value.map(String) : [];
  }

  private toJson(input: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(input)) as Prisma.InputJsonValue;
  }
}
