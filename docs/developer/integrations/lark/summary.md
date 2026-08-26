# 飞书集成现状

飞书能力当前分为可复用 API 适配层和会议事件层：

```text
src/integrations/lark/
├── lark.client.ts
├── services/bitable.service.ts
├── repositories/              # 会议、录制文件、用户和编号表仓储
├── validators/
└── types/

src/lark-meeting/
├── controllers/webhook.controller.ts
├── services/lark-meeting.service.ts
├── queue/lark-event.processor.ts
└── adapter/
```

## 已实现能力

- `/webhooks/lark` 接收飞书事件并保存 Webhook 日志。
- 事件写入 `lark-events` BullMQ 队列，由 Processor 异步消费。
- `BitableService` 提供单条、批量、搜索、迭代与 upsert 操作。
- 领域 Repository 负责把会议、录制文件等业务字段映射到多维表格。
- 配置由 `src/configs/lark.config.ts` 加载；集成测试使用独立测试表。

## 验证

```bash
# 不访问真实飞书的单元测试
pnpm test:unit -- --runInBand src/integrations/lark

# 访问真实测试表，需要 .env.test
pnpm test:integration -- --runInBand test/integration/bitable.service.int-spec.ts
```

集成测试会创建并尽力清理数据，必须使用隔离的测试多维表格，不能指向生产表。配置和表字段要求见[测试指南](./bitable/testing-guide.md)。

## 维护边界

旧版本文档中的 `libs/integrations-lark`、`lark.integration.spec.ts` 和 `scripts/test-lark-integration.ts` 已不再存在。新增共享能力应放在 `src/integrations/lark`；会议事件编排保留在 `src/lark-meeting`。
