# 系统架构

Nove API 是一个 NestJS 现代化企业级单体应用，围绕身份认证与权限、组织与项目管理、会议与 AI 纪要、智能体技能、商业交易和第三方集成组织领域模块。应用同时暴露 REST、GraphQL、MCP、Webhook 与运维入口，PostgreSQL 保存业务数据，Redis 支撑 BullMQ 异步队列。

## 运行时拓扑

```mermaid
flowchart LR
  Client[管理端 / Web / App] --> REST[REST + Swagger / ReDoc]
  Agent[AI 智能体] --> MCP[MCP Server (SSE/HTTP)]
  Vendor[腾讯会议 / 飞书 / 企微 / 微信小店 / Stripe] --> Hook[Webhook Controllers]

  REST --> Guard[UnifiedAuth + Scope + Permission Guards]
  MCP --> App[NestJS 领域模块]
  Hook --> App
  Guard --> App

  App --> DB[(PostgreSQL / Prisma 7)]
  App --> Queue[(Redis / BullMQ)]
  Queue --> Worker[队列处理器]
  Worker --> DB
  App --> External[LLM / 邮件 / 短信 / 存储 / 平台 API]
```

全局 `ValidationPipe` 开启 `whitelist`、`forbidNonWhitelisted` 和 `transform`。认证、Scope 与权限守卫在 `AppModule` 中以 `APP_GUARD` 全局生效；公开接口通过 `@Public()` 显式声明，特定权限通过 `@RequirePermissions()` 声明。

## 主要业务边界

- **身份与授权 (Auth & IAM)**：`auth`、`oauth`、`admin/oauth-client`、`admin/api-key`、`admin/role`、`admin/permission`。
- **组织与多项目 (Org & Projects)**：`admin/org`、`admin/dept`、`admin/org-member`、`project`、`user`、`user-platform`。
- **会议与纪要 (Meeting & Minute)**：`meeting` 负责会议元数据、录制与参会人；`minute` 负责语音转写片段、全文纪要总结与参会发言人总结。
- **AI 智能体基础设施 (Agents & Skills)**：`skill`（技能 Zip 上传与不可变版本控制）、`mcp-server`（MCP 工具与协议）、`llm`（模型隔离与提示词调用）。
- **商业与交易 (Commerce)**：`product`、`channel`、`order`、`order-refund`、`profit-sharing`、`stripe`。
- **第三方集成 (Integrations)**：`tmeet`、`lark`、`wecom`、`wechat-shop`、`mail`、`sms`。
- **系统基础设施 (Infrastructure)**：`prisma`、`redis`、`task`、`storage`、`file-scanning`、`webhook-log`、`admin/integrations`。

模块详细清单见[模块地图](./module-map.md)，目录约定见[项目结构](./project-structure.md)，脚本命令见[命令说明](../guides/collaboration/scripts.md)。

## 本地交互与调试入口

在本地启动 `pnpm start:dev` 后可访问：

| 入口 | 地址 | 说明 |
|---|---|---|
| **Swagger UI** | `http://localhost:3000/api` | 在线 API 调试与交互 |
| **OpenAPI JSON** | `http://localhost:3000/api-json` | OpenAPI 3.0 规范源文件 |
| **ReDoc 文档** | `http://localhost:3000/docs` | 美化版阅读式 API 文档 |
| **GraphQL** | `http://localhost:3000/graphql` | GraphQL 交互式 Playground（非生产） |
| **Bull Board** | `http://localhost:3000/queues` | 异步任务队列可视化监控（Basic Auth） |
| **应用健康检查** | `http://localhost:3000/` | 应用基础健康心跳响应 |
