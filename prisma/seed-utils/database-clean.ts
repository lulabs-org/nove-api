import { PrismaClient } from '@prisma/client';
import * as readline from 'readline';
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

