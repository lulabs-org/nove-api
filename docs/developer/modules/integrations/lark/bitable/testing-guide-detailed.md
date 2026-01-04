# 飞书多维表格集成测试指南

本文档说明如何运行飞书多维表格的集成测试。

## 测试环境准备

### 1. 配置测试环境变量

1. 复制测试环境文件：

```bash
cp .env.test.example .env.test
```

2. 编辑 `.env.test` 文件，填入真实的测试配置：

```bash
# 飞书应用配置
LARK_APP_ID=你的飞书应用ID
LARK_APP_SECRET=你的飞书应用密钥

# 多维表格测试配置
LARK_TEST_APP_TOKEN=你的测试多维表格app_token
LARK_TEST_TABLE_ID=你的测试表格ID
```

### 2. 获取飞书配置信息

#### 获取 LARK_APP_ID 和 LARK_APP_SECRET

1. 登录 [飞书开放平台](https://open.feishu.cn/)
2. 进入「开发者后台」
3. 创建「企业自建应用」
4. 在「凭证与基础信息」中获取：
   - App ID → `LARK_APP_ID`
   - App Secret → `LARK_APP_SECRET`

#### 获取 LARK_TEST_APP_TOKEN 和 LARK_TEST_TABLE_ID

1. 在飞书中创建一个测试用的多维表格
2. 获取 app_token：
   - 打开多维表格，复制URL中的token部分
   - URL格式：`https://base.feishu.cn/base/[app_token]?table=[table_id]`
   - 提取 `[app_token]` 作为 `LARK_TEST_APP_TOKEN`

3. 获取 table_id：
   - 在多维表格中，点击表格名称旁的「...」
   - 选择「表格设置」→ 复制「表格ID」作为 `LARK_TEST_TABLE_ID`

### 3. 配置IP白名单

确保当前服务器的IP地址已添加到飞书应用的IP白名单：

1. 登录 [飞书开放平台](https://open.feishu.cn/)
2. 进入应用管理 → 安全设置
3. 在「IP白名单」中添加当前服务器IP

### 4. 测试表格字段要求

测试用例假设测试表格包含以下字段：

- `测试文本` (文本类型)
- `测试数字` (数字类型)
- `测试布尔` (复选框类型)
- `测试日期` (日期类型)
- `唯一标识` (文本类型，用于upsert测试)

## 运行测试

### 运行所有集成测试

```bash
# 使用pnpm
pnpm test:integration

# 或者直接使用jest
npx jest libs/integrations-lark/bitable.service.spec.ts --config ./test/jest-integration.json
```

### 运行单个测试文件

```bash
# 运行bitable服务测试
npx jest libs/integrations-lark/bitable.service.spec.ts --config ./test/jest-integration.json --runInBand
```

### 调试模式运行

```bash
# 启用详细日志
DEBUG=true npx jest libs/integrations-lark/bitable.service.spec.ts --config ./test/jest-integration.json --verbose
```

## 测试说明

### 测试内容

测试文件 `bitable.service.spec.ts` 包含以下测试场景：

1. **基础CRUD操作**
   - 创建记录
   - 更新记录
   - 搜索记录
   - 删除记录

2. **批量操作**
   - 批量创建记录
   - 批量更新记录
   - 批量获取记录
   - 批量删除记录

3. **Upsert操作**
   - 单条记录的upsert（创建/更新）
   - 批量upsert操作

4. **迭代器功能**
   - 使用迭代器获取所有记录
   - 使用搜索迭代器

5. **错误处理**
   - 无效的应用token
   - 无效的表格ID
   - 无效的字段名

### 测试数据清理

测试运行后会自动清理创建的测试记录，确保不影响测试环境。

### 注意事项

1. 确保测试表格有足够的权限（应用需要有编辑权限）
2. 测试会真实操作多维表格，请使用专门的测试表格
3. 如果测试失败，请检查网络连接和IP白名单配置
4. 建议先在测试环境中验证配置是否正确

## 故障排除

### 常见问题

1. **权限错误**
   - 错误信息：`permission denied`
   - 解决：检查应用是否有表格的编辑权限

2. **IP白名单错误**
   - 错误信息：`access denied by ip whitelist`
   - 解决：在飞书应用设置中添加当前服务器IP

3. **字段不存在**
   - 错误信息：`field not found`
   - 解决：确保测试表格包含所需的测试字段

4. **配置错误**
   - 错误信息：`invalid app_token or table_id`
   - 解决：检查 `.env.test` 中的配置是否正确

### 调试技巧

1. 启用详细日志：`LOG_API_RESPONSES=true`
2. 使用 `--verbose` 参数查看详细测试输出
3. 检查飞书开放平台中的应用日志
