# 飞书多维表格集成测试

真实 API 测试位于 `test/integration/bitable.service.int-spec.ts`，覆盖 CRUD、批量操作、搜索/迭代和 upsert。它会修改远端数据，不属于无副作用的单元测试。

## 准备隔离环境

在仓库根目录创建不提交的 `.env.test`：

```text
LARK_APP_ID=<test-app-id>
LARK_APP_SECRET=<test-app-secret>
LARK_TEST_APP_TOKEN=<test-bitable-app-token>
LARK_TEST_TABLE_ID=<test-table-id>
```

测试表至少需要与用例对应的 `测试文本`、`测试数字`、`测试布尔`、`测试日期`、`测试单选`、`测试多选`、`测试超链接`、`测试电话号码`、`测试邮箱` 等字段。字段类型必须匹配测试数据。

## 运行

```bash
# 只运行该文件
pnpm test:integration -- --runInBand test/integration/bitable.service.int-spec.ts

# 聚焦一个 describe/it
pnpm test:integration -- --runInBand \
  test/integration/bitable.service.int-spec.ts \
  --testNamePattern='基础CRUD操作'

# 排查未关闭句柄
pnpm test:integration -- --runInBand \
  test/integration/bitable.service.int-spec.ts \
  --detectOpenHandles
```

不要使用旧的 `test/jest-integration.json` 或 `libs/integrations-lark/...` 路径；当前项目由根 `jest.config.ts` 的 integration project 管理。

## 清理与排障

测试在 `afterAll` 中批量删除已记录的测试数据。进程被强制终止时可能留下记录，需要到测试表手动清理。

- “测试配置不完整”：确认 `.env.test` 位于仓库根且四个变量均有值。
- 403/权限不足：确认飞书应用已获多维表格权限，并被授权访问目标表。
- 字段错误：核对字段名称、类型和单选/多选选项。
- 超时或限流：使用 `--runInBand`，等待限流窗口后重试；不要并行操作同一测试表。

更完整的测试设计说明见[详细测试指南](./testing-guide-detailed.md)。
