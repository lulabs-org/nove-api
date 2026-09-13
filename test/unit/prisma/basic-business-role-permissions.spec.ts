import type { PrismaClient } from '@/generated/prisma/client';
import { addBasicBusinessRolePermissions } from '../../../scripts/ts/add-basic-business-role-permissions';

describe('basic business role permission script', () => {
  it('adds every baseline permission to every business role idempotently', async () => {
    const upsert = jest.fn().mockResolvedValue({});
    const prisma = {
      role: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'member-role', code: 'MEMBER' },
          { id: 'teacher-role', code: 'HEAD_TEACHER' },
          { id: 'mentor-role', code: 'MENTOR' },
        ]),
      },
      permission: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'dashboard', code: 'dashboard:read' },
          { id: 'product', code: 'product:read' },
          { id: 'project', code: 'project:read' },
          { id: 'channel', code: 'channel:read' },
          { id: 'order', code: 'order:read' },
          { id: 'drive', code: 'drive:read' },
        ]),
      },
      rolePermission: {
        upsert,
      },
    } as unknown as PrismaClient;

    await expect(addBasicBusinessRolePermissions(prisma)).resolves.toEqual({
      roleCount: 3,
      permissionCount: 6,
      assignmentCount: 18,
    });
    expect(upsert).toHaveBeenCalledTimes(18);
    expect(upsert).toHaveBeenCalledWith({
      where: {
        roleId_permissionId: {
          roleId: 'member-role',
          permissionId: 'dashboard',
        },
      },
      update: { deletedAt: null },
      create: { roleId: 'member-role', permissionId: 'dashboard' },
    });
  });

  it('fails before writing when required seed data is missing', async () => {
    const upsert = jest.fn();
    const prisma = {
      role: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'mentor-role', code: 'MENTOR' }]),
      },
      permission: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      rolePermission: {
        upsert,
      },
    } as unknown as PrismaClient;

    await expect(addBasicBusinessRolePermissions(prisma)).rejects.toThrow(
      '缺少角色',
    );
    expect(upsert).not.toHaveBeenCalled();
  });
});
