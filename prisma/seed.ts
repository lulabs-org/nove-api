/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-06 21:33:50
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-08-18 16:55:00
 * @FilePath: /nove_api/prisma/seed.ts
 * @Description:数据库种子数据脚本
 * 使用方法:
 * - npx tsx prisma/seed.ts                                # 初始化所有种子数据（mock 模式）
 * - npx tsx prisma/seed.ts --real                         # 初始化所有种子数据（real 模式）
 * - npx tsx prisma/seed.ts --module <name>                # 仅初始化指定模块数据（mock 模式）
 * - npx tsx prisma/seed.ts --real --module <name>         # 仅初始化指定模块数据（real 模式）
 * 
 * 模块同步示例:
 * - npx tsx prisma/seed.ts --module permissions           # 仅初始化权限数据（mock 模式）
 * - npx tsx prisma/seed.ts --module platform-users        # 仅初始化平台用户数据（mock 模式）
 * - npx tsx prisma/seed.ts --real --module permissions    # 仅初始化权限数据（real 模式）
 *
 * 支持的独立同步模块: permissions, products, channels, projects, platform-users, meetings, orders, refunds, oauth-clients
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { PrismaClient } from '@prisma/client';
import { seedDatabase } from './seed-utils/database-seed';
import type { SeedMode } from './seed-utils/types';
import * as seedFunctions from './seeds';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const mode: SeedMode = process.argv.includes('--real') ? 'real' : 'mock';

  // 检查是否指定了只运行特定模块
  const moduleIndex = process.argv.indexOf('--module');
  if (moduleIndex !== -1 && moduleIndex + 1 < process.argv.length) {
    const moduleName = process.argv[moduleIndex + 1];
    console.log(`\n🚀 开始独立同步模块: ${moduleName} (${mode} 模式)...`);

    switch (moduleName) {
      case 'permissions':
        {
          const permissions = await seedFunctions.createPermissions(
            prisma,
            mode === 'real',
          );
          const roles = await prisma.role.findMany();
          await seedFunctions.assignRolePermissions(prisma, permissions, roles);
        }
        break;
      case 'products':
        await seedFunctions.createProducts(prisma);
        break;
      case 'channels':
        await seedFunctions.createChannels(prisma);
        break;
      case 'projects':
        await seedFunctions.createProjects(prisma);
        break;
      case 'platform-users':
        await seedFunctions.createPlatformUsers(prisma);
        break;
      case 'meetings':
        await seedFunctions.createMeetings(prisma);
        break;
      case 'orders':
        await seedFunctions.createOrders(prisma);
        break;
      case 'refunds':
        await seedFunctions.createRefunds(prisma);
        break;
      case 'oauth-clients':
        await seedFunctions.createOAuthClients(prisma);
        break;
      default:
        console.error(`❌ 不支持单独同步模块或模块不存在: ${moduleName}`);
        console.log(
          '支持的独立同步模块: permissions, products, channels, projects, platform-users, meetings, orders, refunds, oauth-clients',
        );
        process.exit(1);
    }

    console.log(`\n✅ 模块 ${moduleName} 同步完成！`);
    return;
  }

  try {
    await seedDatabase(prisma, mode);
  } catch (error) {
    console.error(`❌ 种子数据初始化失败:`, error);
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
