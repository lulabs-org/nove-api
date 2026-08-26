# 多维表格测试设计

本页补充[集成测试运行指南](./testing-guide.md)，说明当前测试边界和新增用例规范。

## 测试分层

- `src/integrations/lark/**/*.spec.ts`：Mock 外部调用，验证映射、服务和仓储逻辑。
- `test/integration/bitable.service.int-spec.ts`：调用真实飞书测试表，验证 SDK、认证和字段契约。
- `test/setup-integration.ts`：integration project 的通用环境初始化。

真实 API 用例必须串行运行，并使用专门的测试应用和测试表。不要在 CI 中注入生产凭据，也不要让测试依赖已有业务记录。

## 新增用例

1. 在测试表创建明确命名的测试字段和选项。
2. 用时间戳或 UUID 生成唯一值，避免并发或上次残留导致冲突。
3. 创建成功后立即保存 `record_id` 到清理集合。
4. 对返回结构和远端字段值分别断言。
5. 在 `afterAll` 尽力批量删除；清理失败应输出 record ID，便于人工恢复。

## 常用命令

```bash
pnpm test:integration -- --runInBand test/integration/bitable.service.int-spec.ts
pnpm test:integration -- --runInBand \
  test/integration/bitable.service.int-spec.ts \
  --testNamePattern='应该能够创建记录'
```

如需调试网络问题，可附加 `--detectOpenHandles --verbose`。切勿在日志中打印 App Secret、访问令牌或完整响应头。

## 合并门禁

纯逻辑变更至少通过相关单元测试和 `pnpm build`。改变飞书字段、请求体或 upsert 语义时，再运行真实 integration test，并在 PR 中说明测试表、运行时间和清理结果。
