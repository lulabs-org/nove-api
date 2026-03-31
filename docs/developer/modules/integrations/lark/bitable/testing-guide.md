# 飞书多维表格服务测试文档

本文档详细介绍了如何运行和配置 `bitable.service.int-spec.ts` 集成测试。

## 测试概述

该测试文件位于 `/libs/integrations-lark/bitable.service.int-spec.ts`，包含以下测试场景：

- **基础CRUD操作**：创建、读取、更新、删除记录
- **批量操作**：批量创建、更新、获取、删除记录
- **Upsert操作**：根据条件创建或更新记录
- **迭代器功能**：使用迭代器获取所有记录和搜索记录
- **错误处理**：处理无效的应用token、表格ID、字段名等错误情况

## 环境配置

### 1. 创建测试环境文件

在项目根目录创建 `.env.test` 文件：

```bash
# 飞书应用配置
LARK_APP_ID=your_app_id
LARK_APP_SECRET=your_app_secret

# 测试用的多维表格配置
LARK_TEST_APP_TOKEN=your_test_app_token
LARK_TEST_TABLE_ID=your_test_table_id
```

### 2. 获取配置值

- **LARK_APP_ID** 和 **LARK_APP_SECRET**：从飞书开发者后台获取
- **LARK_TEST_APP_TOKEN**：测试多维表格的 app_token（从表格URL中获取）
- **LARK_TEST_TABLE_ID**：测试表格的 ID（从表格URL中获取）

## 运行测试

### 基本测试命令

```bash
# 运行所有集成测试
npx jest libs/integrations-lark/bitable.service.int-spec.ts --config ./test/jest-integration.json --verbose

# 运行特定测试套件
npx jest libs/integrations-lark/bitable.service.int-spec.ts --config ./test/jest-integration.json --testNamePattern="基础CRUD操作"

# 运行特定测试用例
npx jest libs/integrations-lark/bitable.service.int-spec.ts --config ./test/jest-integration.json --testNamePattern="应该能够创建记录"

# 以观察模式运行测试
npx jest libs/integrations-lark/bitable.service.int-spec.ts --config ./test/jest-integration.json --watch
```

### 调试命令

```bash
# 带调试信息运行
npx jest libs/integrations-lark/bitable.service.int-spec.ts --config ./test/jest-integration.json --verbose --detectOpenHandles

# 生成测试覆盖率报告
npx jest libs/integrations-lark/bitable.service.int-spec.ts --config ./test/jest-integration.json --coverage
```

## 测试数据清理

测试会自动清理创建的记录，但如果测试中断，可能需要手动清理：

```bash
# 查看测试表格中的所有记录
node scripts/check-table-fields.js

# 手动清理测试数据（如果需要）
# 测试记录通常包含 "测试" 关键词，可以在飞书表格中筛选删除
```

## 常见问题和解决方案

### 1. 配置错误

**问题**：`测试配置不完整，请在.env.test中配置 LARK_TEST_APP_TOKEN 和 LARK_TEST_TABLE_ID`

**解决**：确保 `.env.test` 文件中包含所有必需的环境变量。

### 2. 权限错误

**问题**：`权限不足，无法访问表格`

**解决**：

- 确认应用有访问该多维表格的权限
- 检查应用是否正确授权
- 确认测试表格是否为该应用所有或已共享给应用

### 3. 字段名错误

**问题**：`字段不存在或字段名错误`

**解决**：

- 确认测试表格包含以下字段：
  - `测试文本`（文本类型）
  - `测试数字`（数字类型）
  - `测试布尔`（复选框类型）
  - `测试日期`（日期类型）

### 4. 测试超时

**问题**：测试运行超时

**解决**：

```bash
# 增加超时时间
npx jest libs/integrations-lark/bitable.service.int-spec.ts --config ./test/jest-integration.json --testTimeout=30000
```

## 测试结构说明

### 测试数据字段映射

测试使用以下字段名：

- `测试文本` - 用于文本字段测试
- `测试数字` - 用于数字字段测试，使用时间戳确保唯一性
- `测试布尔` - 用于布尔字段测试
- `测试日期` - 用于日期字段测试，使用Unix时间戳

### 测试记录识别

测试记录通过以下方式识别：

- 包含特定文本内容（如"测试"、"upsert测试"等）
- 使用唯一的时间戳作为数字字段值
- 自动收集记录ID用于测试后清理

## 扩展测试

### 添加新测试用例

1. 在相应测试套件中添加新的 `it` 块
2. 确保包含适当的断言
3. 考虑测试数据的清理

### 测试新功能

1. 先在测试表格中添加相应字段
2. 更新测试用例中的字段名映射
3. 运行测试验证新功能

## 相关脚本

项目中提供了以下辅助脚本：

```bash
# 快速运行bitable测试
./scripts/test-lark-bitable.sh

# 验证飞书配置
node scripts/validate-lark-config.js

# 检查表格字段
node scripts/check-table-fields.js
```

## 注意事项

1. **测试环境隔离**：确保测试不会影响生产数据
2. **API限制**：注意飞书API的调用频率限制
3. **数据清理**：测试完成后会自动清理，但建议定期检查
4. **网络连接**：测试需要稳定的网络连接访问飞书服务器

## 技术支持

如果遇到问题，可以：

1. 查看飞书开放平台文档：https://open.feishu.cn/
2. 检查项目中的 `docs/LARK_INTEGRATION.md` 文档
3. 查看测试日志输出获取详细错误信息