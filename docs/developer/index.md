# Nove API 开发者文档

本文档面向后端开发、集成开发和运维人员。内容以当前 NestJS 模块、Prisma schema、根 `package.json`、Docker/CI 配置为基线；具体接口字段始终以运行中的 OpenAPI 文档为准。

## 快速定位

| 目标 | 核心文档 |
|---|---|
| 理解运行时、模块和目录 | [架构索引](architecture/index.md) · [模块地图](architecture/module-map.md) · [项目结构](architecture/project-structure.md) |
| 搭建数据库与运行项目 | [Prisma 7 配置](guides/database/prisma-setup.md) · [Package 脚本](guides/collaboration/scripts.md) |
| 团队协作与测试规范 | [Trunk-Based Git 协作](guides/collaboration/git.md) · [NestJS 测试规范](guides/collaboration/testing.md) |
| 身份认证、API Key 与 OAuth | [认证概述](modules/iam/overview.md) · [API Key](modules/iam/api-key.md) · [OAuth 客户端](modules/iam/oauth.md) |
| 组织架构与多项目隔离 | [组织与成员](modules/iam/organization.md) · [多项目空间](modules/agent/project.md) |
| 会议与 AI 纪要体系 | [会议核心](modules/meeting/overview.md) · [纪要与 AI 总结](modules/meeting/minute.md) · [追踪报告](modules/meeting/tracking-report.md) |
| 智能体设施与系统技能 | [系统技能 (Skill)](modules/agent/skill.md) · [MCP 连接指南](modules/agent/mcp.md) · [云盘资产](modules/agent/drive.md) |
| 商业与交易结算 | [商业与交易域](modules/commerce/overview.md) |
| 服务集成中心与密钥管理 | [服务集成后端架构](integrations/architecture.md) · [后台集成配置指南](integrations/service-integrations.md) |
| 协同办公与消息通知 | [腾讯会议](integrations/tencent-meeting/overview.md) · [企微 Hermes](integrations/wecom/overview.md) · [飞书](integrations/lark/overview.md) · [邮件与短信](integrations/messaging/mail.md) |
| 构建与生产发布 | [部署概览](guides/deployment/overview.md) · [部署指南](guides/deployment/guide.md) |

## 当前能力边界

- REST、GraphQL、MCP 与多平台 Webhook 由同一 NestJS 应用统一承载。
- PostgreSQL/Prisma 7 保存业务数据；Redis/BullMQ 承担飞书、企微事件、微信订单同步等异步任务。
- 全局认证、Scope、权限和 DTO 校验统一生效，例外必须通过装饰器显式声明。
- 会议域覆盖会议、录制、转写、会议全文总结和参会发言人洞察；AI 生成由 `minute` + `llm` 编排。
- 全局系统配置支持邮件、AI、腾讯会议、企业微信、飞书、微信小店与云盘安全策略；服务环境变量只在首次启动时导入，敏感字段只返回掩码。

路线图文档（如[会议插件系统](roadmap/meeting-plugin-system.md)）描述未来方案，不代表已经实现；阅读时应与[模块地图](architecture/module-map.md)中的当前能力区分。

## 文档维护规则

1. 修改路由、DTO、权限码或脚本时，同步更新对应文档。
2. 架构页只写当前代码可验证的行为；设想放入 `roadmap/` 并标注阶段。
3. 新增页面后更新 `.vitepress/config.mts` 导航。
4. 提交前运行 `pnpm docs:build`，不得通过关闭死链检查绕过错误。
