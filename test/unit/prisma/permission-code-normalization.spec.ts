import type { PrismaClient } from '@/generated/prisma/client';
import { normalizeLegacyPermissionCodes } from '../../../scripts/ts/normalize-permission-codes';

describe('permission code normalization script', () => {
  it('moves legacy role and member bindings to the canonical permission', async () => {
    const tx = {
      permission: {
        findUnique: jest.fn(({ where }: { where: { code: string } }) => {
          if (where.code === 'organization:read') {
            return Promise.resolve({
              id: 'legacy-permission',
              code: where.code,
            });
          }
          if (where.code === 'org:read') {
            return Promise.resolve({
              id: 'canonical-permission',
              code: where.code,
            });
          }
          return Promise.resolve(null);
        }),
        update: jest.fn(),
      },
      rolePermission: {
        findMany: jest.fn().mockResolvedValue([{ roleId: 'role-1' }]),
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
      memberPermission: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ memberId: 'member-1', granted: false }]),
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback: (client: typeof tx) => Promise<void>) =>
        callback(tx),
      ),
    } as unknown as PrismaClient;
    await normalizeLegacyPermissionCodes(prisma);

    expect(tx.rolePermission.upsert).toHaveBeenCalledWith({
      where: {
        roleId_permissionId: {
          roleId: 'role-1',
          permissionId: 'canonical-permission',
        },
      },
      update: { deletedAt: null },
      create: {
        roleId: 'role-1',
        permissionId: 'canonical-permission',
      },
    });
    expect(tx.memberPermission.upsert).toHaveBeenCalledWith({
      where: {
        memberId_permissionId: {
          memberId: 'member-1',
          permissionId: 'canonical-permission',
        },
      },
      update: { deletedAt: null },
      create: {
        memberId: 'member-1',
        permissionId: 'canonical-permission',
        granted: false,
      },
    });
    expect(tx.rolePermission.deleteMany).toHaveBeenCalledWith({
      where: { permissionId: 'legacy-permission' },
    });
    expect(tx.memberPermission.deleteMany).toHaveBeenCalledWith({
      where: { permissionId: 'legacy-permission' },
    });
    expect(tx.permission.update).toHaveBeenCalledWith({
      where: { id: 'legacy-permission' },
      data: { active: false },
    });
  });
});
