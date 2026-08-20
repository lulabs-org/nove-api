// @ts-nocheck
import { PrismaClient, Prisma } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/**
 * 用法:
 *   tsx scripts/mjs/relate-tables.ts --sourceModel=PlatformUser --targetModel=User --sourceField=email --targetField=email --foreignKey=localUserId --batch=1000 --dryRun=true
 *
 * 说明:
 *   - --sourceModel 必填: 源模型名称（需要更新外键的模型）
 *   - --targetModel 必填: 目标模型名称（提供外键值的模型）
 *   - --sourceField 必填: 源模型中用于匹配的字段
 *   - --targetField 必填: 目标模型中用于匹配的字段
 *   - --foreignKey 必填: 源模型中需要更新的外键字段（指向目标模型的主键）
 *   - --batch 可选: 每批处理行数，默认 1000
 *   - --dryRun 可选: true/false，默认 true（仅模拟不执行）
 *   - --where 可选: 源模型的过滤条件（JSON 格式），例如: --where='{"active":true}'
 *   --targetWhere 可选: 目标模型的过滤条件（JSON 格式），例如: --targetWhere='{"active":true}'
 */
function getArg(name, def = undefined) {
  const hit = process.argv.find((x) => x.startsWith(`--${name}=`));
  if (!hit) return def;
  return hit.split("=").slice(1).join("=");
}

const SOURCE_MODEL = getArg("sourceModel");
const TARGET_MODEL = getArg("targetModel");
const SOURCE_FIELD = getArg("sourceField");
const TARGET_FIELD = getArg("targetField");
const FOREIGN_KEY = getArg("foreignKey");
const BATCH_SIZE = Number(getArg("batch", "1000"));
const DRY_RUN = (getArg("dryRun", "true") + "").toLowerCase() === "true";
const WHERE = getArg("where", "");
const TARGET_WHERE = getArg("targetWhere", "");

if (!SOURCE_MODEL || !TARGET_MODEL || !SOURCE_FIELD || !TARGET_FIELD || !FOREIGN_KEY) {
  console.error("❌ 缺少参数。示例: node relate-tables.mjs --sourceModel=PlatformUser --targetModel=User --sourceField=email --targetField=email --foreignKey=localUserId");
  process.exit(1);
}

const dmmf = Prisma.dmmf;

function getModelMeta(modelName) {
  const m = dmmf.datamodel.models.find((x) => x.name === modelName);
  if (!m) {
    const all = dmmf.datamodel.models.map((x) => x.name).join(", ");
    throw new Error(`找不到 model: ${modelName}. 可用 model: [${all}]`);
  }
  return m;
}

function validateFields(modelMeta, fieldName, fieldType = null) {
  const field = modelMeta.fields.find((f) => f.name === fieldName);
  if (!field) {
    const all = modelMeta.fields.map((f) => f.name).join(", ");
    throw new Error(`在 ${modelMeta.name} 中找不到字段: ${fieldName}. 可用字段: [${all}]`);
  }
  
  if (fieldType && field.kind !== fieldType) {
    throw new Error(`字段 ${fieldName} 的类型应为 ${fieldType}，实际为 ${field.kind}`);
  }
  
  return field;
}

function parseWhereClause(whereStr) {
  if (!whereStr) return undefined;
  try {
    return JSON.parse(whereStr);
  } catch (e) {
    throw new Error(`无法解析 where 条件: ${whereStr}. 错误: ${e.message}`);
  }
}

async function main() {
  console.log("🔗 开始关联表数据...");
  console.log(`源模型: ${SOURCE_MODEL}`);
  console.log(`目标模型: ${TARGET_MODEL}`);
  console.log(`匹配字段: ${SOURCE_MODEL}.${SOURCE_FIELD} = ${TARGET_MODEL}.${TARGET_FIELD}`);
  console.log(`外键字段: ${SOURCE_MODEL}.${FOREIGN_KEY}`);
  console.log(`批量大小: ${BATCH_SIZE}`);
  console.log(`模拟模式: ${DRY_RUN ? "是" : "否"}`);

  const sourceMeta = getModelMeta(SOURCE_MODEL);
  const targetMeta = getModelMeta(TARGET_MODEL);

  validateFields(sourceMeta, SOURCE_FIELD, "scalar");
  validateFields(targetMeta, TARGET_FIELD, "scalar");
  validateFields(sourceMeta, FOREIGN_KEY, "scalar");

  const sourceDelegate = prisma[SOURCE_MODEL.charAt(0).toLowerCase() + SOURCE_MODEL.slice(1)];
  const targetDelegate = prisma[TARGET_MODEL.charAt(0).toLowerCase() + TARGET_MODEL.slice(1)];

  if (!sourceDelegate?.findMany || !sourceDelegate?.updateMany) {
    throw new Error(`源模型 ${SOURCE_MODEL} 不支持 findMany/updateMany 操作`);
  }
  if (!targetDelegate?.findMany) {
    throw new Error(`目标模型 ${TARGET_MODEL} 不支持 findMany 操作`);
  }

  const whereClause = parseWhereClause(WHERE);
  const targetWhereClause = parseWhereClause(TARGET_WHERE);

  console.log(`\n📊 查询条件:`);
  if (whereClause) console.log(`  源模型过滤: ${JSON.stringify(whereClause)}`);
  if (targetWhereClause) console.log(`  目标模型过滤: ${JSON.stringify(targetWhereClause)}`);

  let totalProcessed = 0;
  let totalMatched = 0;
  let totalUpdated = 0;
  let skipped = 0;

  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const sourceRecords = await sourceDelegate.findMany({
      where: {
        ...whereClause,
        [FOREIGN_KEY]: null,
      },
      select: {
        id: true,
        [SOURCE_FIELD]: true,
      },
      take: BATCH_SIZE,
      skip: offset,
    });

    if (sourceRecords.length === 0) {
      hasMore = false;
      break;
    }

    const sourceValues = sourceRecords.map((r) => r[SOURCE_FIELD]).filter((v) => v !== null && v !== undefined);

    if (sourceValues.length === 0) {
      offset += BATCH_SIZE;
      continue;
    }

    const targetRecords = await targetDelegate.findMany({
      where: {
        ...targetWhereClause,
        [TARGET_FIELD]: { in: sourceValues },
      },
      select: {
        id: true,
        [TARGET_FIELD]: true,
      },
    });

    const targetMap = new Map();
    for (const target of targetRecords) {
      targetMap.set(String(target[TARGET_FIELD]), target.id);
    }

    const updates = [];

    for (const source of sourceRecords) {
      totalProcessed++;
      const sourceValue = String(source[SOURCE_FIELD]);
      const targetId = targetMap.get(sourceValue);

      if (targetId) {
        totalMatched++;
        updates.push({
          id: source.id,
          [FOREIGN_KEY]: targetId,
        });
      } else {
        skipped++;
      }
    }

    if (updates.length > 0) {
      if (DRY_RUN) {
        console.log(`\n🔍 模拟更新 ${updates.length} 条记录:`);
        for (const update of updates.slice(0, 5)) {
          console.log(`  ${SOURCE_MODEL}.id=${update.id} -> ${FOREIGN_KEY}=${update[FOREIGN_KEY]}`);
        }
        if (updates.length > 5) {
          console.log(`  ... 还有 ${updates.length - 5} 条`);
        }
        totalUpdated += updates.length;
      } else {
        for (const update of updates) {
          await sourceDelegate.update({
            where: { id: update.id },
            data: { [FOREIGN_KEY]: update[FOREIGN_KEY] },
          });
        }
        totalUpdated += updates.length;
        process.stdout.write(`\r🚚 已处理 ${totalProcessed} 行 | 匹配 ${totalMatched} | 更新 ${totalUpdated} | 跳过 ${skipped}`);
      }
    }

    offset += BATCH_SIZE;
    if (sourceRecords.length < BATCH_SIZE) {
      hasMore = false;
    }
  }

  console.log(`\n\n✅ 完成:`);
  console.log(`  总处理: ${totalProcessed}`);
  console.log(`  匹配成功: ${totalMatched}`);
  console.log(`  更新记录: ${totalUpdated} ${DRY_RUN ? "(模拟)" : ""}`);
  console.log(`  跳过: ${skipped}`);

  if (DRY_RUN) {
    console.log(`\n💡 当前为模拟模式，实际未修改任何数据。`);
    console.log(`   如需执行实际更新，请添加 --dryRun=false`);
  }
}

main()
  .catch((e) => {
    console.error("\n❌ 关联失败：", e?.message || e);
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
