import fs from "fs";
import { parse } from "csv-parse";
import { PrismaClient, Prisma } from "@prisma/client";
import cuid from 'cuid';

const prisma = new PrismaClient();

/**
 * 用法:
 *   node scripts/mjs/import-csv-prisma.mjs --model=User --file=./data.csv --batch=1000 --skipDuplicates=true
 *   node scripts/mjs/import-csv-prisma.mjs --model=User --file=scripts/csv_data/User2.csv --batch=1000 --skipDuplicates=true
 *   node scripts/mjs/import-csv-prisma.mjs --model=PlatformUser --file=scripts/csv_data/user_platforms2.csv --batch=1000 --skipDuplicates=true
 *
 * 说明:
 *   - --model 必填: Prisma 的 Model 名（区分大小写，如 User / Post）
 *   - --file  必填: CSV 文件路径
 *   - --batch 可选: 每批写入行数，默认 1000
 *   - --skipDuplicates 可选: true/false，默认 true（仅对 createMany 生效）
 *   - --mapping 可选: CSV 表头到 Prisma 模型字段的映射，格式为 "csvHeader:modelField,csvHeader2:modelField2"
 *                   例如: --mapping=csv_id:id,csv_name:name
 */
function getArg(name, def = undefined) {
  const hit = process.argv.find((x) => x.startsWith(`--${name}=`));
  if (!hit) return def;
  return hit.split("=").slice(1).join("=");
}

const MODEL = getArg("model");
const FILE = getArg("file");
const BATCH_SIZE = Number(getArg("batch", "1000"));
const SKIP_DUPLICATES = (getArg("skipDuplicates", "true") + "").toLowerCase() === "true";
const MAPPING = getArg("mapping", "");

if (!MODEL || !FILE) {
  console.error("❌ 缺少参数。示例: node import-csv-prisma.mjs --model=User --file=./data.csv");
  process.exit(1);
}

// Prisma DMMF: 运行期拿到 schema 元信息（字段名、类型、可空、默认值等）
const dmmf = Prisma.dmmf;

function getModelMeta(modelName) {
  const m = dmmf.datamodel.models.find((x) => x.name === modelName);
  if (!m) {
    const all = dmmf.datamodel.models.map((x) => x.name).join(", ");
    throw new Error(`找不到 model: ${modelName}. 可用 model: [${all}]`);
  }
  return m;
}

// 基础类型转换：按 Prisma 字段类型把字符串转成合适的 JS 值
function coerceValue(raw, field) {
  // csv-parse 会给字符串；空串当作 null/undefined
  if (raw === undefined) return undefined;
  if (raw === null) return null;

  const s = String(raw).trim();
  if (s === "") {
    // 空串：可空字段 -> null；不可空字段 -> undefined（让 Prisma 用默认值/报错）
    return field.isRequired ? undefined : null;
  }

  // field.type: "String"|"Int"|"Float"|"Boolean"|"DateTime"|"Json"|枚举|模型名...
  switch (field.type) {
    case "String":
      return s;

    case "Int": {
      const n = Number.parseInt(s, 10);
      return Number.isNaN(n) ? undefined : n;
    }

    case "BigInt": {
      try { return BigInt(s); } catch { return undefined; }
    }

    case "Float":
    case "Decimal": {
      const n = Number.parseFloat(s);
      return Number.isNaN(n) ? undefined : n;
    }

    case "Boolean": {
      const v = s.toLowerCase();
      if (["true", "1", "yes", "y"].includes(v)) return true;
      if (["false", "0", "no", "n"].includes(v)) return false;
      return undefined;
    }

    case "DateTime": {
      const d = new Date(s);
      return Number.isNaN(d.getTime()) ? undefined : d;
    }

    case "Json": {
      // 允许 CSV 里放 JSON 字符串：{"a":1} 或 [1,2]
      try { return JSON.parse(s); } catch { return undefined; }
    }

    case "Bytes": {
      // 支持 base64
      try { return Buffer.from(s, "base64"); } catch { return undefined; }
    }

    default:
      // 枚举：保持字符串；关系字段/模型字段通常不应从 CSV 直接写（需 nested create/connect）
      // 这里保持原样（字符串），让 Prisma 自行校验
      return s;
  }
}

function normalizeHeader(h) {
  // 允许 header 有空格或大小写差异： " createdAt " -> "createdAt"
  return String(h || "").trim();
}

async function main() {
  const modelMeta = getModelMeta(MODEL);

  // 找出可直接写入的字段（排除 relation 字段，包含标量字段和枚举字段）
  const writableFields = modelMeta.fields.filter((f) => f.kind === "scalar" || f.kind === "enum");
  const fieldByName = new Map(writableFields.map((f) => [f.name, f]));

  const requiredFields = writableFields.filter((f) => f.isRequired).map((f) => f.name);

  const mapping = new Map();
  if (MAPPING) {
    MAPPING.split(",").forEach((pair) => {
      const [csvHeader, modelField] = pair.split(":").map((s) => s.trim());
      if (csvHeader && modelField) {
        mapping.set(csvHeader, modelField);
      }
    });
  }

  // 识别 id 字段（你说 id 用 cuid）
  const idField = writableFields.find((f) => f.name === "id");

  const clientDelegate = prisma[MODEL.charAt(0).toLowerCase() + MODEL.slice(1)];
  if (!clientDelegate?.createMany) {
    throw new Error(`prisma.${MODEL} delegate 不存在或不支持 createMany（检查 model 名大小写）`);
  }

  let total = 0;
  let inserted = 0;
  let skipped = 0;

  const batch = [];
  let csvHeaders = null;
  let mappedFields = null;

  const parser = fs
    .createReadStream(FILE)
    .pipe(
      parse({
        columns: (headers) => headers.map(normalizeHeader),
        skip_empty_lines: true,
        bom: true, // 处理 UTF-8 BOM
        relax_column_count: true,
        trim: true,
      })
    );

  for await (const row of parser) {
    if (!csvHeaders) {
      csvHeaders = Object.keys(row);

      // 自动匹配：只保留 Prisma model 里存在的标量字段
      // 如果提供了 mapping，优先使用 mapping；否则使用自动匹配
      if (mapping.size > 0) {
        mappedFields = csvHeaders
          .filter((h) => mapping.has(h) && fieldByName.has(mapping.get(h)))
          .map((h) => ({ header: h, field: fieldByName.get(mapping.get(h)) }));
      } else {
        mappedFields = csvHeaders
          .filter((h) => fieldByName.has(h))
          .map((h) => ({ header: h, field: fieldByName.get(h) }));
      }

      if (mappedFields.length === 0) {
        const modelFieldNames = writableFields.map((f) => f.name).join(", ");
        throw new Error(
          `CSV 表头与 ${MODEL} 字段无法匹配。\nCSV headers: ${csvHeaders.join(", ")}\nModel writable fields: ${modelFieldNames}`
        );
      }

      console.log("✅ 自动匹配字段：", mappedFields.map((x) => x.header).join(", "));
      if (idField) console.log("✅ 检测到 id 字段：", idField.type, "required=", idField.isRequired);
    }

    total++;

    // 构建 data：只写入能匹配到的字段
    const data = {};
    for (const { header, field } of mappedFields) {
      const v = coerceValue(row[header], field);
      if (v !== undefined) data[field.name] = v;
    }

    // 检查必填字段是否有值（除了 id，因为 id 会自动生成）
    const missingRequiredFields = [];
    for (const { field } of mappedFields) {
      if (field.isRequired && field.name !== "id" && data[field.name] === undefined) {
        missingRequiredFields.push(field.name);
      }
    }

    if (missingRequiredFields.length > 0) {
      console.warn(`⚠️  跳过第 ${total} 行：缺少必填字段 ${missingRequiredFields.join(", ")}`);
      skipped++;
      continue;
    }

    // 自动生成 cuid：当 model 有 id 且 data.id 为空/缺失
    if (idField) {
      const hasId = data.id !== undefined && data.id !== null && String(data.id).trim() !== "";
      if (!hasId) {
        // 仅当 id 是 String 且通常为 cuid 使用场景
        data.id = cuid();
      }
    }

    batch.push(data);

    if (batch.length >= BATCH_SIZE) {
      const res = await clientDelegate.createMany({
        data: batch,
        skipDuplicates: SKIP_DUPLICATES,
      });

      inserted += res.count;
      skipped += batch.length - res.count;
      batch.length = 0;

      process.stdout.write(`\r🚚 已处理 ${total} 行 | 写入 ${inserted} | 跳过 ${skipped}`);
    }
  }

  // flush last batch
  if (batch.length > 0) {
    const res = await clientDelegate.createMany({
      data: batch,
      skipDuplicates: SKIP_DUPLICATES,
    });

    inserted += res.count;
    skipped += batch.length - res.count;
  }

  console.log(`\n✅ 完成: 总行数 ${total} | 写入 ${inserted} | 跳过 ${skipped}`);
}

main()
  .catch((e) => {
    console.error("\n❌ 导入失败：", e?.message || e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });