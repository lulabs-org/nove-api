import '../../src/prisma/load-prisma-env';
import { PrismaClient } from '@/generated/prisma/client';
import { createPrismaAdapter } from '../../src/prisma/prisma-adapter';

const BUSINESS_ROLE_CODES = ['MEMBER', 'HEAD_TEACHER', 'MENTOR'] as const;
const BASIC_PERMISSION_CODES = [
  'dashboard:read',
  'product:read',
  'project:read',
  'channel:read',
  'order:read',
  'drive:read',
] as const;

export interface BusinessRolePermissionResult {
  roleCount: number;
  permissionCount: number;
  assignmentCount: number;
}

export async function addBasicBusinessRolePermissions(
  prisma: PrismaClient,
): Promise<BusinessRolePermissionResult> {
  const [roles, permissions] = await Promise.all([
    prisma.role.findMany({
      where: {
        code: { in: [...BUSINESS_ROLE_CODES] },
        active: true,
        isDeleted: false,
      },
      select: { id: true, code: true },
    }),
    prisma.permission.findMany({
      where: { code: { in: [...BASIC_PERMISSION_CODES] }, active: true },
      select: { id: true, code: true },
    }),
  ]);

  const missingRoleCodes = BUSINESS_ROLE_CODES.filter(
    (code) => !roles.some((role) => role.code === code),
  );
  const missingPermissionCodes = BASIC_PERMISSION_CODES.filter(
    (code) => !permissions.some((permission) => permission.code === code),
  );
  if (missingRoleCodes.length || missingPermissionCodes.length) {
    throw new Error(
      [
        missingRoleCodes.length
          ? `缺少角色: ${missingRoleCodes.join(', ')}`
          : '',
        missingPermissionCodes.length
          ? `缺少权限: ${missingPermissionCodes.join(', ')}`
          : '',
      ]
        .filter(Boolean)
        .join('; '),
    );
  }

  const assignments = roles.flatMap((role) =>
    permissions.map((permission) => ({
      roleId: role.id,
      permissionId: permission.id,
    })),
  );
  for (const assignment of assignments) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: assignment },
      update: { deletedAt: null },
      create: assignment,
    });
  }

  return {
    roleCount: roles.length,
    permissionCount: permissions.length,
    assignmentCount: assignments.length,
  };
}

async function main(): Promise<void> {
  const prisma = new PrismaClient({ adapter: createPrismaAdapter() });
  try {
    const result = await addBasicBusinessRolePermissions(prisma);
    console.log(
      `基础业务角色权限补齐完成：${result.roleCount} 个角色，${result.permissionCount} 项权限，确认 ${result.assignmentCount} 条关联`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  void main();
}
