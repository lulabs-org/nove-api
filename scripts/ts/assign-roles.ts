/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-15 20:03:14
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-15 20:19:59
 * @FilePath: /nove_api/scripts/ts/assign-roles.ts
 * @Description: 为用户分配角色的脚本
 * 
 * # 为单个用户分配角色
 * pnpm dlx tsx scripts/ts/assign-roles.ts admin-role user-001
 * 
 * # 为多个用户分配角色
 * pnpm dlx tsx scripts/ts/assign-roles.ts member-role user-001 user-002 user-003 user-004
 * 
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved. 
 */

import { PrismaClient } from '@prisma/client';
import { assignRolesToUsers } from '../../prisma/seeds/relations/user-relations/user-roles';

const prisma = new PrismaClient();

interface CommandLineArgs {
  userIds: string[];
  roleId: string;
}

function parseCommandLineArgs(): CommandLineArgs {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('❌ 错误: 缺少必要的参数');
    console.log('\n使用方法:');
    console.log('  tsx scripts/assign-roles.ts <roleId> <userId1> <userId2> ...');
    console.log('\n参数说明:');
    console.log('  roleId   - 要分配的角色ID');
    console.log('  userIds  - 要分配角色的用户ID列表（可多个）');
    console.log('\n示例:');
    console.log('  tsx scripts/assign-roles.ts role-123 user-001 user-002 user-003');
    process.exit(1);
  }

  const roleId = args[0];
  const userIds = args.slice(1);

  return { roleId, userIds };
}

async function main(): Promise<void> {
  const { roleId, userIds } = parseCommandLineArgs();

  console.log('🚀 开始分配角色到用户...');
  console.log(`📋 角色ID: ${roleId}`);
  console.log(`👥 用户数量: ${userIds.length}`);
  console.log(`👥 用户ID列表: ${userIds.join(', ')}`);

  try {
    await assignRolesToUsers(prisma, userIds, roleId);
    console.log('\n✅ 角色分配成功！');
    console.log(`📊 已为 ${userIds.length} 个用户分配角色 ${roleId}`);
  } catch (error) {
    console.error('\n❌ 角色分配失败:', error);
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
