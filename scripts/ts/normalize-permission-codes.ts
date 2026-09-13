import '../../src/prisma/load-prisma-env';
import { PrismaClient } from '@/generated/prisma/client';
import { createPrismaAdapter } from '../../src/prisma/prisma-adapter';

const PERMISSION_CODE_MAPPINGS = [
  ['organization:read', 'org:read', 'org'],
  ['organization:create', 'org:create', 'org'],
  ['organization:update', 'org:update', 'org'],
  ['organization:delete', 'org:delete', 'org'],
  ['department:read', 'dept:read', 'dept'],
  ['department:create', 'dept:create', 'dept'],
  ['department:update', 'dept:update', 'dept'],
  ['department:delete', 'dept:delete', 'dept'],
] as const;

export async function normalizeLegacyPermissionCodes(
  prisma: PrismaClient,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const [
      legacyCode,
      canonicalCode,
      resource,
    ] of PERMISSION_CODE_MAPPINGS) {
      const legacyPermission = await tx.permission.findUnique({
        where: { code: legacyCode },
      });
      if (!legacyPermission) continue;

      const canonicalPermission = await tx.permission.findUnique({
        where: { code: canonicalCode },
      });

      if (!canonicalPermission) {
        await tx.permission.update({
          where: { id: legacyPermission.id },
          data: { code: canonicalCode, resource, active: true },
        });
        continue;
      }

      const roleBindings = await tx.rolePermission.findMany({
        where: { permissionId: legacyPermission.id },
        select: { roleId: true },
      });
      for (const binding of roleBindings) {
        await tx.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: binding.roleId,
              permissionId: canonicalPermission.id,
            },
          },
          update: { deletedAt: null },
          create: {
            roleId: binding.roleId,
            permissionId: canonicalPermission.id,
          },
        });
      }

      const memberBindings = await tx.memberPermission.findMany({
        where: { permissionId: legacyPermission.id },
        select: { memberId: true, granted: true },
      });
      for (const binding of memberBindings) {
        await tx.memberPermission.upsert({
          where: {
            memberId_permissionId: {
              memberId: binding.memberId,
              permissionId: canonicalPermission.id,
            },
          },
          update: { deletedAt: null },
          create: {
            memberId: binding.memberId,
            permissionId: canonicalPermission.id,
            granted: binding.granted,
          },
        });
      }

      await tx.rolePermission.deleteMany({
        where: { permissionId: legacyPermission.id },
      });
      await tx.memberPermission.deleteMany({
        where: { permissionId: legacyPermission.id },
      });
      await tx.permission.update({
        where: { id: legacyPermission.id },
        data: { active: false },
      });
    }
  });
}

async function main(): Promise<void> {
  const prisma = new PrismaClient({ adapter: createPrismaAdapter() });
  try {
    await normalizeLegacyPermissionCodes(prisma);
    console.log('权限编码规范化完成');
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  void main();
}
