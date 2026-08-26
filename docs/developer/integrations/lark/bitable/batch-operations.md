# Lark Bitable 新功能文档

本文档介绍了在 Lark Bitable 集成中新添加的批量操作功能。

## 新增功能概览

### 1. 删除单条记录

- **方法**: `deleteBitableRecord()` (LarkClient) / `deleteRecord()` (BitableService)
- **功能**: 删除指定的单条记录
- **参数**: app_token, table_id, record_id

### 2. 批量创建记录

- **方法**: `batchCreateBitableRecords()` (LarkClient) / `batchCreateRecords()` (BitableService)
- **功能**: 一次性创建多条记录
- **参数**: app_token, table_id, records数组

### 3. 批量更新记录

- **方法**: `batchUpdateBitableRecords()` (LarkClient) / `batchUpdateRecords()` (BitableService)
- **功能**: 一次性更新多条记录
- **参数**: app_token, table_id, records数组(包含record_id和fields)

### 4. 批量获取记录

- **方法**: `batchGetBitableRecords()` (LarkClient) / `batchGetRecords()` (BitableService)
- **功能**: 根据记录ID批量获取记录详情
- **参数**: app_token, table_id, record_ids数组

### 5. 批量删除记录

- **方法**: `batchDeleteBitableRecords()` (LarkClient) / `batchDeleteRecords()` (BitableService)
- **功能**: 一次性删除多条记录
- **参数**: app_token, table_id, records数组(记录ID列表)

## 使用示例

### 删除单条记录

```typescript
// 使用 LarkClient
await larkClient.deleteBitableRecord({
    app_token: 'your-app-token',
    table_id: 'your-table-id',
    record_id: 'record-id-to-delete'
});

// 使用 BitableService
await bitableService.deleteRecord('your-app-token', 'your-table-id', 'record-id-to-delete');
```

### 批量创建记录

```typescript
// 使用 LarkClient
await larkClient.batchCreateBitableRecords({
    app_token: 'your-app-token',
    table_id: 'your-table-id',
    records: [
        { fields: { '姓名': '张三', '年龄': 25 } },
        { fields: { '姓名': '李四', '年龄': 30 } },
        { fields: { '姓名': '王五', '年龄': 28 } }
    ]
});

// 使用 BitableService
await bitableService.batchCreateRecords('your-app-token', 'your-table-id', [
    { fields: { '姓名': '张三', '年龄': 25 } },
    { fields: { '姓名': '李四', '年龄': 30 } }
]);
```

### 批量更新记录

```typescript
// 使用 LarkClient
await larkClient.batchUpdateBitableRecords({
    app_token: 'your-app-token',
    table_id: 'your-table-id',
    records: [
        { record_id: 'rec123', fields: { '状态': '已完成', '更新时间': new Date().toISOString() } },
        { record_id: 'rec456', fields: { '状态': '进行中', '更新时间': new Date().toISOString() } }
    ],
    user_id_type: 'open_id'
});

// 使用 BitableService
await bitableService.batchUpdateRecords('your-app-token', 'your-table-id', [
    { record_id: 'rec123', fields: { '状态': '已完成' } },
    { record_id: 'rec456', fields: { '状态': '进行中' } }
]);
```

### 批量获取记录

```typescript
// 使用 LarkClient
const response = await larkClient.batchGetBitableRecords({
    app_token: 'your-app-token',
    table_id: 'your-table-id',
    record_ids: ['rec123', 'rec456', 'rec789'],
    user_id_type: 'open_id',
    with_shared_url: true,
    automatic_fields: true
});

// 使用 BitableService
const response = await bitableService.batchGetRecords('your-app-token', 'your-table-id', ['rec123', 'rec456'], {
    userIdType: 'open_id',
    withSharedUrl: true
});
```

### 批量删除记录

```typescript
// 使用 LarkClient
await larkClient.batchDeleteBitableRecords({
    app_token: 'your-app-token',
    table_id: 'your-table-id',
    records: ['rec123', 'rec456', 'rec789']
});

// 使用 BitableService
await bitableService.batchDeleteRecords('your-app-token', 'your-table-id', ['rec123', 'rec456', 'rec789']);
```

## 错误处理

所有新方法都包含完整的错误处理和日志记录：

- 使用 try-catch 捕获异常
- 记录详细的错误信息到日志
- 抛出原始错误供上层处理

## 性能优化

- **批量操作**: 使用批量API减少网络请求次数
- **字段格式化**: 自动处理 Map 到 Object 的转换
- **空值过滤**: 自动过滤掉 null/undefined 的字段值

## 类型安全

所有新方法都使用 TypeScript 类型定义，提供完整的类型检查和智能提示支持。

## 测试

可以使用提供的测试脚本 `test-new-lark-features.ts` 来验证新功能：

```bash
# 设置环境变量
export LARK_APP_ID=your-app-id
export LARK_APP_SECRET=your-app-secret

# 运行测试
npx ts-node test-new-lark-features.ts
```
