import { ErpSystemService } from '../src/erp/system/erp-system.service';

describe('ErpSystemService user auth fields', () => {
  const buildPrismaService = () => ({
    erpSystemUser: {
      upsert: jest.fn().mockResolvedValue({
        id: 'user-1',
        username: 'staff',
      }),
    },
    erpSystemUserRole: {
      deleteMany: jest.fn(),
      create: jest.fn(),
    },
    erpSystemAuditLog: {
      create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    },
    $transaction: jest
      .fn()
      .mockImplementation((operations: Array<Promise<unknown>>) =>
        Promise.all(operations),
      ),
  });

  it('stores password hashes but never writes plaintext passwords to audit logs', async () => {
    const prismaService = buildPrismaService();
    const service = new ErpSystemService(prismaService as never, {
      hashPassword: jest.fn().mockReturnValue('scrypt:salt:hash'),
    } as never);

    await service.saveUser({
      username: 'staff',
      displayName: 'Staff',
      email: 'staff@example.com',
      password: 'plaintext-secret',
      active: true,
      roleIds: ['role-1'],
    });

    expect(prismaService.erpSystemUser.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          passwordHash: 'scrypt:salt:hash',
          passwordChangedAt: expect.any(Date),
        }),
        update: expect.objectContaining({
          passwordHash: 'scrypt:salt:hash',
          passwordChangedAt: expect.any(Date),
        }),
      }),
    );
    expect(prismaService.erpSystemAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'SAVE_USER',
        request: expect.objectContaining({
          username: 'staff',
          passwordChanged: true,
        }),
      }),
    });
    const auditRequest =
      prismaService.erpSystemAuditLog.create.mock.calls[0][0].data.request;
    expect(JSON.stringify(auditRequest)).not.toContain('plaintext-secret');
    expect(auditRequest).not.toHaveProperty('password');
  });
});
