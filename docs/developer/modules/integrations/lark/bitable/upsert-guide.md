# 飞书多维表格 Upsert 操作指南

本文档详细介绍如何使用新增的通用 upsert 方法，实现"存在则更新，不存在则创建"的智能记录管理功能。

## 功能概述

新增的 `upsertRecord` 和 `batchUpsertRecords` 方法提供了智能的记录管理功能，可以根据指定的字段条件自动判断是创建新记录还是更新现有记录。

## 核心方法

### 1. 单条记录 Upsert

#### 方法签名

```typescript
async upsertRecord(
    appToken: string,
    tableId: string,
    fields: BitableField,
    uniqueFields: string[],
    options?: {
        updateMode?: 'merge' | 'replace';
        customFilter?: SearchFilter;
    }
): Promise<{
    recordId: string;
    action: 'created' | 'updated';
    record: LarkRecord;
}>
```

#### 参数说明

- `appToken`: 应用token
- `tableId`: 表格ID
- `fields`: 要创建或更新的字段数据
- `uniqueFields`: 用于查找唯一记录的字段名数组
- `options.updateMode`: 更新模式，'merge'合并字段，'replace'替换整个记录
- `options.customFilter`: 自定义过滤条件

#### 使用示例

**示例1：基于单个字段的upsert**

```typescript
const userFields = {
    '用户ID': 'user123',
    '用户名': '张三',
    '邮箱': 'zhangsan@example.com',
    '状态': '活跃'
};

const result = await bitableService.upsertRecord(
    appToken,
    tableId,
    userFields,
    ['用户ID'] // 基于用户ID查找
);

console.log(`操作: ${result.action}, 记录ID: ${result.recordId}`);
```

**示例2：基于多个字段的upsert**

```typescript
const productFields = {
    '产品名称': 'iPhone 15',
    '规格': '256GB',
    '颜色': '蓝色',
    '价格': 6999,
    '库存': 100
};

const result = await bitableService.upsertRecord(
    appToken,
    tableId,
    productFields,
    ['产品名称', '规格', '颜色'], // 基于多个字段组合查找
    { updateMode: 'merge' }
);
```

**示例3：使用自定义过滤条件**

```typescript
const orderFields = {
    '订单号': 'ORD2024001',
    '客户ID': 'CUST001',
    '状态': '已支付'
};

const result = await bitableService.upsertRecord(
    appToken,
    tableId,
    orderFields,
    ['订单号'],
    {
        customFilter: {
            field_name: '状态',
            operator: 'isNot',
            value: ['已取消']
        },
        updateMode: 'replace'
    }
);
```

### 2. 批量记录 Upsert

#### 方法签名

```typescript
async batchUpsertRecords(
    appToken: string,
    tableId: string,
    records: BitableField[],
    uniqueFields: string[],
    options?: {
        updateMode?: 'merge' | 'replace';
        batchSize?: number;
    }
): Promise<{
    created: Array<{ recordId: string; record: LarkRecord }>;
    updated: Array<{ recordId: string; record: LarkRecord }>;
    errors: Array<{ index: number; error: Error }>;
}>
```

#### 使用示例

```typescript
const batchRecords = [
    {
        '员工ID': 'EMP001',
        '姓名': '李四',
        '部门': '技术部',
        '职位': '高级工程师'
    },
    {
        '员工ID': 'EMP002',
        '姓名': '王五',
        '部门': '销售部',
        '职位': '销售经理'
    },
    {
        '员工ID': 'EMP003',
        '姓名': '赵六',
        '部门': '人事部',
        '职位': 'HR专员'
    }
];

const batchResult = await bitableService.batchUpsertRecords(
    appToken,
    tableId,
    batchRecords,
    ['员工ID'],
    {
        updateMode: 'merge',
        batchSize: 5
    }
);

console.log(`批量操作完成:`);
console.log(`- 创建: ${batchResult.created.length} 条`);
console.log(`- 更新: ${batchResult.updated.length} 条`);
console.log(`- 错误: ${batchResult.errors.length} 条`);
```

## 高级用法

### 1. 处理复杂字段类型

upsert方法支持所有飞书多维表格的字段类型：

```typescript
const complexFields = {
    // 文本字段
    '文本字段': '这是一个文本',
    
    // 数字字段
    '数字字段': 123.45,
    
    // 日期字段（时间戳）
    '日期字段': 1704067200000,
    
    // 单选字段
    '单选字段': '选项A',
    
    // 多选字段
    '多选字段': ['选项1', '选项2', '选项3'],
    
    // 人员字段
    '人员字段': [{
        id: 'ou_xxx',
        type: 'open_id'
    }],
    
    // 附件字段
    '附件字段': [{
        file_token: 'file_token_xxx',
        name: '文档.pdf',
        type: 'application/pdf'
    }],
    
    // 超链接字段
    '超链接字段': {
        link: 'https://example.com',
        text: '点击访问'
    },
    
    // 电话号码
    '电话号码': '+86 13800138000',
    
    // 复选框
    '复选框': true,
    
    // 地理位置
    '地理位置': {
        lat: 39.9042,
        lng: 116.4074,
        address: '北京市朝阳区'
    }
};

const result = await bitableService.upsertRecord(
    appToken,
    tableId,
    complexFields,
    ['文本字段', '电话号码'],
    { updateMode: 'merge' }
);
```

### 2. 错误处理

```typescript
try {
    const result = await bitableService.upsertRecord(
        appToken,
        tableId,
        fields,
        uniqueFields
    );
    
    console.log(`成功: ${result.action}`);
} catch (error) {
    console.error('Upsert失败:', error.message);
    
    // 可以在这里进行错误处理，比如重试、记录日志等
    if (error.message.includes('权限')) {
        // 处理权限错误
    } else if (error.message.includes('字段')) {
        // 处理字段错误
    }
}
```

### 3. 性能优化

对于大量数据操作，建议使用批量upsert：

```typescript
// 将大量数据分批处理
const largeDataSet = [...]; // 假设有1000条记录
const batchSize = 50; // 每批处理50条

for (let i = 0; i < largeDataSet.length; i += batchSize) {
    const batch = largeDataSet.slice(i, i + batchSize);
    
    const result = await bitableService.batchUpsertRecords(
        appToken,
        tableId,
        batch,
        ['唯一标识字段'],
        { batchSize }
    );
    
    console.log(`处理批次 ${i/batchSize + 1}: 创建 ${result.created.length}, 更新 ${result.updated.length}`);
    
    // 可以在这里添加延迟，避免API限制
    await new Promise(resolve => setTimeout(resolve, 1000));
}
```

## 使用场景示例

### 1. 用户数据同步

```typescript
// 从外部系统同步用户数据
const syncUserData = async (users: UserData[]) => {
    const records = users.map(user => ({
        '用户ID': user.id,
        '用户名': user.name,
        '邮箱': user.email,
        '手机号': user.phone,
        '注册时间': user.createdAt.getTime(),
        '最后登录': user.lastLogin?.getTime() || null
    }));

    return await bitableService.batchUpsertRecords(
        appToken,
        '用户表',
        records,
        ['用户ID']
    );
};
```

### 2. 库存管理

```typescript
// 更新商品库存
const updateInventory = async (sku: string, quantity: number) => {
    return await bitableService.upsertRecord(
        appToken,
        '库存表',
        {
            'SKU': sku,
            '当前库存': quantity,
            '更新时间': Date.now()
        },
        ['SKU'],
        { updateMode: 'merge' }
    );
};
```

### 3. 订单状态跟踪

```typescript
// 更新订单状态
const updateOrderStatus = async (orderNo: string, status: string) => {
    return await bitableService.upsertRecord(
        appToken,
        '订单表',
        {
            '订单号': orderNo,
            '状态': status,
            '更新时间': Date.now()
        },
        ['订单号'],
        { updateMode: 'merge' }
    );
};
```

## 注意事项

1. **唯一字段选择**：确保选择的唯一字段组合能够唯一标识一条记录
2. **字段类型匹配**：传入的字段值类型必须与表格中定义的字段类型匹配
3. **API限制**：注意飞书API的调用频率限制，批量操作时建议设置合适的batchSize
4. **错误处理**：建议对批量操作的结果进行详细检查，特别是错误处理
5. **性能考虑**：对于大量数据，建议使用批量操作并适当添加延迟

## 测试

提供了测试脚本，可以通过以下命令测试upsert功能：

```bash
# 设置测试环境变量
export LARK_APP_ID=your_app_id
export LARK_APP_SECRET=your_app_secret
export LARK_APP_TOKEN=your_app_token
export LARK_TABLE_ID=your_table_id

# 运行测试
npx ts-node libs/integrations-lark/examples/test-upsert.ts
```

## 技术支持

如需更多帮助，请参考：

- [飞书多维表格API文档](https://open.feishu.cn/document/server-docs/docs/bitable-v1/bitable-overview)
- [示例代码](libs/integrations-lark/examples/upsert-usage.example.ts)
- [测试脚本](libs/integrations-lark/examples/test-upsert.ts)
