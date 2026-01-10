import { PrismaClient } from '@prisma/client';
import type { TableDependencies } from './types';

export async function getAllTables(prisma: PrismaClient): Promise<string[]> {
  console.log('📋 正在获取数据库表名...');
  const result = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    ORDER BY tablename
  `;

  const tables = result.map((row) => row.tablename);
  console.log(`📊 发现 ${tables.length} 个表:`, tables);
  return tables;
}

export async function analyzeTableDependencies(
  prisma: PrismaClient,
): Promise<TableDependencies> {
  console.log('🔍 正在分析表依赖关系...');
  const dependencies = new Map<string, string[]>();

  const foreignKeys = await prisma.$queryRaw<
    Array<{
      table_name: string;
      foreign_table_name: string;
    }>
  >`
    SELECT 
      tc.table_name,
      ccu.table_name AS foreign_table_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND ccu.table_schema = 'public'
  `;

  for (const fk of foreignKeys) {
    if (!dependencies.has(fk.table_name)) {
      dependencies.set(fk.table_name, []);
    }
    dependencies.get(fk.table_name)!.push(fk.foreign_table_name);
  }

  console.log('✅ 表依赖关系分析完成');
  return dependencies;
}

export function topologicalSort(
  tables: string[],
  dependencies: TableDependencies,
): string[] {
  const visited = new Set<string>();
  const result: string[] = [];

  function visit(table: string) {
    if (visited.has(table)) return;

    visited.add(table);

    const deps = dependencies.get(table) || [];
    for (const dep of deps) {
      if (tables.includes(dep)) {
        visit(dep);
      }
    }

    result.push(table);
  }

  for (const table of tables) {
    visit(table);
  }

  return result.reverse();
}

export async function analyzeDatabaseStructure(
  prisma: PrismaClient,
): Promise<void> {
  console.log('🔍 正在分析数据库结构...');

  try {
    const allTables = await getAllTables(prisma);
    const dependencies = await analyzeTableDependencies(prisma);

    console.log('\n🔗 表依赖关系:');
    for (const [table, deps] of Array.from(dependencies.entries())) {
      console.log(`  ${table} -> [${deps.join(', ')}]`);
    }

    const sortedTables = topologicalSort(allTables, dependencies);
    console.log('\n📋 建议的删除顺序:');
    sortedTables.forEach((table, index) => {
      console.log(`  ${index + 1}. ${table}`);
    });

    console.log('\n✅ 数据库结构分析完成！');
  } catch (error) {
    console.error('❌ 分析数据库结构失败:', error);
    throw error;
  }
}
