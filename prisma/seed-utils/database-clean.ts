import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';
import type { DatabaseOperationOptions } from './types';
import {
  getAllTables,
  analyzeTableDependencies,
  topologicalSort,
} from './table-dependencies';

function toPascalCase(str: string): string {
  return str.replace(/(^\w|_\w)/g, (match) =>
    match.replace('_', '').toUpperCase(),
  );
}

function toCamelCase(str: string): string {
  const pascalCase = toPascalCase(str);
  return pascalCase.charAt(0).toLowerCase() + pascalCase.slice(1);
}

function hasPrismaModel(prisma: PrismaClient, modelName: string): boolean {
  try {
    const prismaUnknown = prisma as unknown as Record<string, unknown>;
    return prismaUnknown[toCamelCase(modelName)] !== undefined;
  } catch {
    return false;
  }
}

async function readUserInput(prompt: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(prompt, (answer: string) => {
      void rl.close();
      resolve(answer.trim());
    });
  });
}

async function cleanupTableData(
  prisma: PrismaClient,
  table: string,
): Promise<void> {
  const modelName = toPascalCase(table);

  if (hasPrismaModel(prisma, modelName)) {
    const prismaUnknown = prisma as unknown as Record<
      string,
      { deleteMany: (args: unknown) => Promise<unknown> }
    >;
    const model = prismaUnknown[toCamelCase(modelName)];
    if (model && typeof model.deleteMany === 'function') {
      await model.deleteMany({});
      console.log(`✅ 已清理表数据: ${table}`);
    }
  } else {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
    console.log(`✅ 已清理表数据（SQL）: ${table}`);
  }
}

async function confirmDropOperation(
  tables: string[],
  force: boolean,
): Promise<void> {
  console.log('\n⚠️  ⚠️  ⚠️  警告 ⚠️  ⚠️  ⚠️');
  console.log('即将删除上述所有表，此操作不可恢复！');
  console.log(`将删除 ${tables.length} 个表: ${tables.join(', ')}`);

  if (!force) {
    const confirmation = await readUserInput(
      '\n请输入 "DELETE" 确认删除操作，或直接回车取消: ',
    );

    if (confirmation !== 'DELETE') {
      console.log('❌ 用户取消删除操作');
      throw new Error('用户取消删除操作');
    }
  }
}

export async function cleanDatabase(prisma: PrismaClient): Promise<void> {
  console.log('🧹 开始自动清理数据库...');

  try {
    const allTables = await getAllTables(prisma);

    if (allTables.length === 0) {
      console.log('ℹ️ 数据库中没有表需要清理');
      return;
    }

    const dependencies = await analyzeTableDependencies(prisma);
    const sortedTables = topologicalSort(allTables, dependencies);
    console.log('📊 按依赖关系排序后的清理顺序:', sortedTables);

    console.log('\n🗑️ 开始清理表数据...');
    let cleanedCount = 0;

    for (const table of sortedTables) {
      try {
        await cleanupTableData(prisma, table);
        cleanedCount++;
      } catch (error) {
        console.warn(`⚠️ 清理表 ${table} 时出现警告:`, error);
      }
    }

    console.log(
      `\n🎉 数据库清理完成！共清理 ${cleanedCount}/${sortedTables.length} 个表`,
    );
  } catch (error) {
    console.error('❌ 数据库清理失败:', error);
    throw error;
  }
}

export async function dropAllTables(
  prisma: PrismaClient,
  options: DatabaseOperationOptions = {},
): Promise<void> {
  const { force = false } = options;

  if (!force && process.env.NODE_ENV === 'production') {
    throw new Error('生产环境下删除表需要显式确认，请使用 force: true 参数');
  }

  try {
    const allTables = await getAllTables(prisma);

    if (allTables.length === 0) {
      console.log('ℹ️ 数据库中没有表需要删除');
      return;
    }

    const dependencies = await analyzeTableDependencies(prisma);
    const sortedTables = topologicalSort(allTables, dependencies);

    await confirmDropOperation(sortedTables, force);

    console.log('\n🗑️ 开始动态删除表结构...');
    for (const table of sortedTables) {
      try {
        await prisma.$executeRawUnsafe(
          `DROP TABLE IF EXISTS "${table}" CASCADE;`,
        );
        console.log(`✅ 已删除表: ${table}`);
      } catch (error) {
        console.warn(`⚠️ 删除表 ${table} 时出现警告:`, error);
      }
    }

    console.log('🎉 表结构删除完成！');
  } catch (error) {
    console.error('❌ 删除表结构失败:', error);
    throw error;
  }
}
