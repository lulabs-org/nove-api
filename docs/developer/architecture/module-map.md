# 模块设计

本页列出当前由 `src/app.module.ts` 装配的主要领域能力。实际路由、DTO 与权限要求以控制器和生成的 OpenAPI 文档为准。

## 身份、组织与权限

| 模块 | 目录 | 当前职责 |
|---|---|---|
| Auth | `src/auth` | 注册、登录、刷新、登出、密码重置；支持 JWT 与客户端类型 |
| API Key / OAuth | `src/api-key`、`src/oauth` | 应用凭证、Scope 与 OAuth 2.0 授权能力 |
| Role / Permission | `src/role`、`src/permission` | RBAC、数据权限规则与全局权限守卫 |
| Organization | `src/org` | 组织生命周期与租户上下文 |
| Department | `src/dept` | 部门树、移动、状态、负责人和成员查询 |
| Org Member | `src/org-member` | 用邮箱/手机号新增、批量导入、角色/部门关联及软删除 |
| User Platform | `src/user-platform` | 外部平台账号与本地用户关联 |

参见[组织与成员](../modules/org-management/overview.md)。

## 会议与 AI

`meeting` 将会议、录制、转写、会议总结和参会者总结拆成独立控制器与服务。`meet-ai` 负责按参会者或时间周期生成总结，并通过仓储一次聚合生成上下文，避免服务层重复读取关系。腾讯会议与飞书接入分别由 `tencent-mtg` / `tencent-mtg-hook` 和 `lark-meeting` 负责。

## 订单与外部集成

- `wechat-shop`：验证和解密回调、同步历史订单，并用 `wechat-order-sync` 队列异步处理。
- `order`：订单、退款及本地业务映射。
- `mail`、`sms`、`verification`：邮件、短信和一次性验证码。
- `llm`：隔离具体 LLM 供应商，为会议 AI 提供统一调用面。
- `mcp-server`：通过 SSE/HTTP 等传输向外部 Agent 暴露 MCP 能力。

## 基础设施

- `prisma`：数据库连接和事务入口。
- `task`：计划任务、后台任务与处理器。
- `webhook-log`：保存第三方回调的处理状态和脱敏上下文。
- `admin/system-config`：管理邮件、AI、腾讯会议、飞书与微信小店配置，负责首次环境导入、敏感字段加密和热更新事件。参见[系统配置](../modules/system-config/overview.md)。

## 模块依赖规则

1. 通过 NestJS Module 的 imports/exports 建立依赖，不跨领域实例化服务。
2. Controller 必须声明认证/权限语义，并将输入放入 DTO 校验。
3. 集成凭据不得出现在业务日志或响应中；使用配置服务及掩码契约。
4. 网络调用、批量同步等耗时任务优先进入 BullMQ；是否异步以现有模块实现为准。
5. 新增模块后同步 `AppModule`、权限种子、OpenAPI 装饰器、测试和本页。
