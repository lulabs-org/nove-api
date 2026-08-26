# 飞书多维表格集成库

## 新增功能：Upsert操作

### 概述

新增通用方法 `upsertRecord` 和 `batchUpsertRecords`，支持根据指定字段执行"查询-更新或新增"操作。

### 核心功能

#### 1. upsertRecord - 单记录操作

根据指定字段查询记录，存在则更新，不存在则新增。

```typescript
const result = await bitableService.upsertRecord(
    appToken: string,
    tableId: string,
    fields: BitableField,
    queryConditions: {
        matchFields: string[];      // 用于匹配的字段名
        matchMode?: 'exact' | 'partial' | 'or'; // 匹配模式
        caseSensitive?: boolean;    // 是否区分大小写
    },
    options?: {
        mergeFields?: boolean;      // 是否合并更新
        excludeFields?: string[];  // 排除的字段
        returnFullRecord?: boolean; // 返回完整记录
    }
);

// 返回结果
{
    action: 'created' | 'updated',
    record: LarkRecord,
    recordId: string
}
```

#### 2. batchUpsertRecords - 批量操作

支持批量执行upsert操作，可自定义每条记录的查询条件。

```typescript
const results = await bitableService.batchUpsertRecords(
    appToken: string,
    tableId: string,
    records: Array<{
        fields: BitableField;
        queryConditions?: { // 可选的自定义条件
            matchFields: string[];
            matchMode?: 'exact' | 'partial' | 'or';
            caseSensitive?: boolean;
        };
    }>,
    globalQueryConditions: { // 全局默认条件
        matchFields: string[];
        matchMode?: 'exact' | 'partial' | 'or';
        caseSensitive?: boolean;
    },
    options?: {
        mergeFields?: boolean;
        excludeFields?: string[];
        returnFullRecord?: boolean;
        batchSize?: number; // 批量大小，默认10
    }
);
```

### 使用场景示例

#### 场景1：单字段唯一性

```typescript
// 仅根据字段A判断唯一性
await bitableService.upsertRecord(
    appToken,
    tableId,
    { 'A': 'unique-value', 'B': 'data-B', 'C': 'data-C' },
    { matchFields: ['A'], matchMode: 'exact' }
);
```

#### 场景2：多字段组合唯一性

```typescript
// A和B组合必须唯一
await bitableService.upsertRecord(
    appToken,
    tableId,
    { 'A': 'value-A', 'B': 'value-B', 'C': 'data-C' },
    { matchFields: ['A', 'B'], matchMode: 'exact' }
);
```

#### 场景3：三字段组合唯一性

```typescript
// A、B、C组合必须唯一
await bitableService.upsertRecord(
    appToken,
    tableId,
    { 'A': 'value-A', 'B': 'value-B', 'C': 'value-C', 'D': 'data-D' },
    { matchFields: ['A', 'B', 'C'], matchMode: 'exact' }
);
```

#### 场景4：或条件匹配

```typescript
// A或B任一字段匹配即可
await bitableService.upsertRecord(
    appToken,
    tableId,
    { 'A': 'value-A', 'B': 'value-B', 'C': 'data-C' },
    { matchFields: ['A', 'B'], matchMode: 'or' }
);
```

#### 场景5：部分匹配

```typescript
// 字段A包含指定值（不区分大小写）
await bitableService.upsertRecord(
    appToken,
    tableId,
    { 'A': 'partial-value', 'B': 'data-B' },
    { 
        matchFields: ['A'], 
        matchMode: 'partial',
        caseSensitive: false 
    }
);
```

### 批量操作示例

```typescript
const batchRecords = [
    {
        fields: {
            'A': 'batch-1-A',
            'B': 'batch-1-B',
            'C': 'batch-1-C',
            'D': 'batch-1-D'
        }
    },
    {
        fields: {
            'A': 'batch-2-A',
            'B': 'batch-2-B',
            'C': 'batch-2-C',
            'D': 'batch-2-D'
        },
        // 自定义查询条件
        queryConditions: {
            matchFields: ['B', 'C'],
            matchMode: 'exact'
        }
    }
];

const results = await bitableService.batchUpsertRecords(
    appToken,
    tableId,
    batchRecords,
    { matchFields: ['A'], matchMode: 'exact' }, // 全局默认条件
    { 
        mergeFields: true,
        batchSize: 5 
    }
);
```

### 参数说明

#### 匹配模式 (matchMode)

- `exact`: 精确匹配（默认）
- `partial`: 部分匹配（包含关系）
- `or`: 或条件匹配（任一字段匹配即可）

#### 更新选项

- `mergeFields`: 是否合并更新（保留原有字段值）
- `excludeFields`: 更新时排除的字段列表
- `returnFullRecord`: 是否返回完整记录信息

### 错误处理

所有方法都包含完整的错误处理和日志记录，失败时会抛出详细的错误信息。

### 文件结构

- `bitable.service.ts`: 主要服务类，包含upsert功能
- `examples/upsert-usage.example.ts`: 详细使用示例
- `examples/simple-upsert-test.ts`: 简化测试脚本

### 运行测试

```bash
# 设置环境变量
export LARK_APP_ID="your-app-id"
export LARK_APP_SECRET="your-app-secret"
export LARK_APP_TOKEN="your-app-token"
export LARK_TABLE_ID="your-table-id"

# 运行测试
npx ts-node examples/simple-upsert-test.ts
```
