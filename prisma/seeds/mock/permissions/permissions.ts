import { PrismaClient, Permission } from '@prisma/client';
import { PERMISSION_CONFIGS } from './config';

export async function createPermissions(
  prisma: PrismaClient,
): Promise<Permission[]> {
  console.log('🔐 开始创建权限数据...');

  try {
    const permissions: Permission[] = [];

    for (const permissionData of PERMISSION_CONFIGS) {
      const permission = await prisma.permission.upsert({
        where: { code: permissionData.code },
        update: {},
        create: permissionData,
      });
      permissions.push(permission);
      console.log(`✅ 创建权限: ${permission.name}`);
    }

    console.log(`🔑 权限数据创建完成，共 ${permissions.length} 个权限`);
    return permissions;
  } catch (error) {
    console.error('❌ 创建权限数据失败:', error);
    throw error;
  }
}
