# 腾讯会议参考资料

以下页面和 JSON 文件用于对照腾讯会议 OpenAPI/Webhook 字段。它们与 `src/integrations/tencent-meeting`、`src/tencent-mtg`、`src/tencent-mtg-hook` 的实现相关，但不是 Nove API 路由说明。

## OpenAPI 摘要

- [查询会议](./api/查询会议.md)
- [获取账户级会议录制列表](./api/获取账户级会议录制列表.md)
- [查询单个录制详情](./api/查询单个录制详情（文件、转写、纪要）.md)
- [查询录制转写详情](./api/查询录制转写详情.md)
- [获取参会成员明细](./api/获取参会成员明细.md)
- [导出会议聊天记录](./api/导出会议聊天记录.md)
- [智能发言人](./api/智能发言人.md)
- [智能总结](./api/智能总结.md)
- [智能章节](./api/智能章节.md)
- [智能纪要](./api/智能纪要.md)

## 样本

- `examples/open-api/recording-transcript-demo.json`
- `examples/webhook/meeting-started-event-example.json`
- `examples/webhook/meeting-end-event-example.json`
- `examples/webhook/meeting-participant-joined-example.json`
- `examples/webhook/meeting-participant-left-example.json`
- `examples/webhook/recording-completed-example.json`
- `examples/webhook/smart-fullsummary-example.json`
- `examples/webhook/smart-transcripts-event-example.json`

字段或事件处理流程请回到[腾讯会议集成](../../integrations/tencent-meeting/overview.md)和[Webhook 说明](../../integrations/tencent-meeting/webhook.md)。
