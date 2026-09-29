# 模块设计 (Module Map)

本页列出当前由 `src/app.module.ts` 装配的主要领域能力与真实代码目录映射。实际路由、DTO 与权限要求以各控制器和生成的 OpenAPI 文档（`/api`）为准。

## 身份、组织与权限 (Admin & Auth)

管理后台相关能力均收拢在 `src/admin/` 命名空间下：

| 模块 | 目录 | 当前职责 |
|---|---|---|
| Auth | `src/auth` | 注册、登录、刷新、登出、密码重置；支持 JWT 与客户端类型 (Web/App) |
| OAuth | `src/oauth` | OAuth 2.0 PKCE 授权码模式、令牌分发与 Scope 校验 |
| OAuth Client Admin | `src/admin/oauth-client` | 管理 OAuth 客户端应用凭证与重定向 URI 授权 |
| API Key | `src/admin/api-key` | 程序化凭证、访问密钥 (sk_*)、Scope 绑定与用量跟踪 |
| Role & Permission | `src/admin/role`、`src/admin/permission` | RBAC、数据权限规则与全局守卫 (`UnifiedAuthGuard`, `PermissionGuard`) |
| Organization | `src/admin/org` | 组织生命周期、Logo 管理、租户上下文 (`SingleOrgContextService`) |
| Department | `src/admin/dept` | 部门树结构、移动、状态与部门负责人 |
| Org Member | `src/admin/org-member` | 成员增删、批量导入、角色/部门绑定与软删除 |
| User / User Platform | `src/user`、`src/user-platform` | 用户个人资料与外部平台账号（腾讯会议、微信等）关联映射 |

参见[组织与成员](../modules/iam/organization.md)。

## 核心业务与 AI 智能体 (Core & AI)

| 模块 | 目录 | 当前职责 |
|---|---|---|
| Meeting | `src/meeting` | 会议生命周期管理、参会人详情、录制文件关联与组织隔离 |
| Minute | `src/minute` | 会议转写沉淀、AI 全文纪要总结 (`MinuteSummary`)、发言人分析 (`SpeakerSummary`) 与平台发言检索 |
| Skill | `src/skill` | 智能体技能 Zip 包上传、校验、不可变版本控制 (SemVer) 与 Prisma 持久化 |
| Project | `src/project` | 组织内多项目隔离、Slug 自动生成、项目与成员/所有者绑定 |
| Tracking Report | `src/tracking-report` | 会议与任务周期追踪报表、待办事项落实分析 |
| Drive | `src/drive` | 云盘目录树、文件上传下载、Minute 关联文件及权限控制 |
| MCP Server | `src/mcp-server` | 通过 SSE / Streamable HTTP 向外部 Agent 暴露 MCP Tools 与上下文 |
| LLM | `src/llm` | 统一隔离火山引擎方舟、OpenAI 等大模型调用 |

## 商业与交易 (Commerce & Billing)

| 模块 | 目录 | 当前职责 |
|---|---|---|
| Product | `src/product` | 商品与 SKU 目录、类目与售卖价格配置 |
| Channel | `src/channel` | 业务渠道来源与渠道凭据管理 |
| Order / Refund | `src/order`、`src/order-refund` | 订单生命周期、权益发放、售后退款审核与原路退回 |
| Profit Sharing | `src/profit-sharing` | 分账规则配置、实时分账计算、生成与导出结算单 (Payslips) |
| Stripe | `src/stripe` | 海外信用卡与支付凭据处理、Webhook 异步验签与事件分发 |
| Wechat Shop | `src/wechat-shop` | 微信小店/视频号回调验证解密、历史订单异步切片同步 |

## 外部集成与消息通道 (Integrations)

- `src/tmeet`：腾讯会议主动 OpenAPI 封装、Webhook 回调验签与事件处理 (`/webhooks/tmeet`)。
- `src/lark`：飞书多维表格同步与事件队列 (`/webhooks/lark`)。
- `src/wecom`：企业微信与 Hermes 通信网关、回调验签解密 (`/webhooks/wecom/events`)、机器人消息推送。
- `src/mail`、`src/sms`：SMTP 邮件池与阿里云短信验证码发送。
- `src/admin/integrations`：管理邮件、AI、腾讯会议、飞书、微信小店、企业微信配置，负责敏感字段 AES-256-GCM 加密和运行时热更新。

## 基础设施 (Infrastructure)

- `src/prisma`：基于 Prisma 7 和 `@prisma/adapter-pg` 的 PostgreSQL 数据库连接与事务入口。
- `src/redis`：基于 `REDIS_URL` 的连接配置与 BullMQ 任务队列底层支撑。
- `src/storage`：本地文件存储与阿里云 OSS / S3 对象存储统一适配层。
- `src/file-scanning`：集成 ClamAV 与阿里云云安全中心 (SAS) 的文件病毒异步检测。
- `src/task`：系统计划任务、后台定时清理与处理器。
- `src/webhook-log`：保存各平台第三方回调的处理状态和脱敏上下文。

## 模块依赖规则

1. 通过 NestJS Module 的 `imports`/`exports` 建立依赖，不跨领域直接实例化服务。
2. Controller 必须声明认证/权限语义，并将输入放入 DTO 校验。
3. 集成凭据不得出现在业务日志或响应中；使用配置服务及掩码契约。
4. 网络调用、批量同步等耗时任务优先进入 BullMQ；是否异步以现有模块实现为准。
5. 新增模块后同步 `AppModule`、权限种子、OpenAPI 装饰器、测试和本页。
