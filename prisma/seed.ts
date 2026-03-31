/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-06 21:33:50
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-11 00:44:17
 * @FilePath: /nove_api/prisma/seed.ts
 * @Description:数据库种子数据脚本
 * 使用方法:
 * - npx tsx prisma/seed.ts                  # 初始化种子数据（mock 模式）
 * - npx tsx prisma/seed.ts --real          # 初始化种子数据（real 模式）
 * - npx tsx prisma/seed.ts clean           # 清理数据库数据
 * - npx tsx prisma/seed.ts drop            # 删除所有表结构
 * - npx tsx prisma/seed.ts reset           # 重置数据库（清理+初始化）
 * - npx tsx prisma/seed.ts reset --real    # 重置数据库（real 模式）
 * - npx tsx prisma/seed.ts analyze         # 分析数据库结构
 * - npx tsx prisma/seed.ts clean --force   # 强制清理（跳过确认）
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { PrismaClient } from '@prisma/client';
import { parseCommandLineArgs, executeDatabaseOperation } from './seed-utils';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const { command, force, mode } = parseCommandLineArgs();

  try {
    console.log(`🚀 执行命令: ${command} (${mode} 模式)`);
    await executeDatabaseOperation(prisma, command, force, mode);
    console.log(`✅ 命令 ${command} 执行完成！`);
  } catch (error) {
    console.error(`❌ 命令 ${command} 执行失败:`, error);
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
