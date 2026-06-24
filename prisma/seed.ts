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
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { PrismaClient } from '@prisma/client';
import { seedDatabase } from './seed-utils/database-seed';
import type { SeedMode } from './seed-utils/types';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const mode: SeedMode = process.argv.includes('--real') ? 'real' : 'mock';

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
