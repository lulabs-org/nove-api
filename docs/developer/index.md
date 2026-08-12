# Nove API 开发者文档

本文档面向后端开发、集成开发和运维人员。内容以当前 NestJS 模块、Prisma schema、根 `package.json`、Docker/CI 配置为基线；具体接口字段始终以运行中的 OpenAPI 文档为准。

## 快速定位

| 目标 | 文档 |
|---|---|
| 理解运行时、模块和目录 | [系统架构](architecture/overview.md) · [模块设计](architecture/modules.md) · [项目结构](architecture/project-structure.md) |
| 搭建数据库和运行项目 | [Prisma 配置](setup/database/prisma-setup.md) · [Package 脚本](development/package-scripts.md) |
| 编写和运行测试 | [NestJS 测试规范](development/nestjs-testing-standards.md) |
| 理解认证和 API Key | [认证概述](modules/authentication/overview.md) · [API Key](modules/api-key/overview.md) |
| 开发组织/成员能力 | [组织、部门与成员](modules/org-management/overview.md) |
| 管理动态密钥配置 | [全局系统配置](modules/system-config/overview.md) |
| 接入 Agent | [MCP 连接指南](modules/mcp/connection-guide.md) |
| 维护腾讯会议或飞书 | [腾讯会议](integrations/tencent-meeting/overview.md) · [飞书](integrations/lark/overview.md) |
| 构建与发布 | [部署概览](setup/deployment/overview.md) · [部署指南](setup/deployment/guide.md) |

## 当前能力边界

- REST、GraphQL、MCP 与三类平台 Webhook 由同一 NestJS 应用承载。
- PostgreSQL/Prisma 保存业务数据；Redis/BullMQ 承担飞书和微信订单等异步任务。
- 全局认证、Scope、权限和 DTO 校验统一生效，例外必须通过装饰器显式声明。
- 会议域覆盖会议、录制、转写、会议总结和参会者总结；AI 生成由 `meet-ai` + `llm` 编排。
- 全局系统配置目前支持邮件与微信小店，敏感字段只返回掩码。

路线图文档（如[会议插件系统](roadmap/meeting-plugin-system.md)）描述未来方案，不代表已经实现；阅读时应与[模块设计](architecture/modules.md)中的当前能力区分。

## 文档维护规则

1. 修改路由、DTO、权限码或脚本时，同步更新对应文档。
2. 架构页只写当前代码可验证的行为；设想放入 `roadmap/` 并标注阶段。
3. 新增页面后更新 `.vitepress/config.mts` 导航。
4. 提交前运行 `pnpm docs:build`，不得通过关闭死链检查绕过错误。
