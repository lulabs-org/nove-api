/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-11 00:01:42
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-11 00:51:03
 * @FilePath: /nove_api/prisma/seed-utils/command-handler.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import type { ParsedCommandLineArgs, DatabaseCommand, SeedMode } from './types';
import { cleanDatabase, dropAllTables } from './database-clean';
import { seedDatabase } from './database-seed';
import { analyzeDatabaseStructure } from './table-dependencies';
import { PrismaClient } from '@prisma/client';

async function resetDatabase(
  prisma: PrismaClient,
  mode: SeedMode = 'mock',
): Promise<void> {
  console.log('🔄 开始重置数据库...');

  try {
    await cleanDatabase(prisma);
    console.log('\n');
    await seedDatabase(prisma, mode);

    console.log('🎉 数据库重置完成！');
  } catch (error) {
    console.error('❌ 数据库重置失败:', error);
    throw error;
  }
}

export function parseCommandLineArgs(): ParsedCommandLineArgs & {
  mode: SeedMode;
} {
  const args = process.argv.slice(2);
  const command = (args[0] || 'seed') as DatabaseCommand;
  const force = process.argv.includes('--force');
  const mode = (process.argv.includes('--real') ? 'real' : 'mock') as SeedMode;

  return { command, force, mode };
}

export async function executeDatabaseOperation(
  prisma: unknown,
  command: DatabaseCommand,
  force: boolean,
  mode: SeedMode = 'mock',
): Promise<void> {
  switch (command) {
    case 'clean':
      await cleanDatabase(prisma as Parameters<typeof cleanDatabase>[0]);
      break;

    case 'drop':
      await dropAllTables(prisma as Parameters<typeof dropAllTables>[0], {
        force,
      });
      break;

    case 'analyze':
      await analyzeDatabaseStructure(
        prisma as Parameters<typeof analyzeDatabaseStructure>[0],
      );
      break;

    case 'reset':
      await resetDatabase(prisma as Parameters<typeof resetDatabase>[0], mode);
      break;

    case 'seed':
    default:
      await seedDatabase(prisma as Parameters<typeof seedDatabase>[0], mode);
      break;
  }
}
