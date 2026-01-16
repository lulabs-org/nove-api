/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-15 20:27:20
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-15 20:27:21
 * @FilePath: /nove_api/scripts/assign-permissions.ts
 * @Description: 
 * 
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved. 
 */
import { PrismaClient } from '@prisma/client';
import { assignPermissionsToRole } from '../prisma/seeds/relations/permission-relations/role-permissions';

const prisma = new PrismaClient();

interface CommandLineArgs {
  roleId: string;
  permissionIds: string[];
}

function parseCommandLineArgs(): CommandLineArgs {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('❌ 错误: 缺少必要的参数');
    console.log('\n使用方法:');
    console.log('  tsx scripts/assign-permissions.ts <roleId> <permissionId1> <permissionId2> ...');
    console.log('\n参数说明:');
    console.log('  roleId       - 要分配权限的角色ID');
    console.log('  permissionIds - 要分配的权限ID列表（可多个）');
    console.log('\n示例:');
    console.log('  tsx scripts/assign-permissions.ts role-123 perm-001 perm-002 perm-003');
    process.exit(1);
  }

  const roleId = args[0];
  const permissionIds = args.slice(1);

  return { roleId, permissionIds };
}

async function main(): Promise<void> {
  const { roleId, permissionIds } = parseCommandLineArgs();

  console.log('🚀 开始分配权限到角色...');
  console.log(`📋 角色ID: ${roleId}`);
  console.log(`🔑 权限数量: ${permissionIds.length}`);
  console.log(`🔑 权限ID列表: ${permissionIds.join(', ')}`);

  try {
    const permissions = await prisma.permission.findMany({
      where: {
        id: {
          in: permissionIds,
        },
      },
    });

    if (permissions.length === 0) {
      console.error('\n❌ 错误: 未找到任何权限');
      console.log('请检查权限ID是否正确');
      process.exit(1);
    }

    if (permissions.length !== permissionIds.length) {
      console.warn(
        `\n⚠️  警告: 只找到 ${permissions.length}/${permissionIds.length} 个权限`,
      );
    }

    await assignPermissionsToRole(prisma, roleId, permissions);
    console.log('\n✅ 权限分配成功！');
    console.log(`📊 已为角色 ${roleId} 分配 ${permissions.length} 个权限`);
    console.log(
      `📝 权限列表: ${permissions.map((p) => p.code).join(', ')}`,
    );
  } catch (error) {
    console.error('\n❌ 权限分配失败:', error);
    throw error;
  }
}

if (require.main === module) {
  main()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
