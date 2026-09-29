# 核心业务领域模块

本目录系统解释 Nove API 自有领域模块的业务设计、领域实体与架构契约。具体请求/响应字段与实时端点以运行中的 Swagger (`/api`) 为准。

## 🎙️ 会议与 AI 纪要领域 (Meeting & Intelligence)

- [会议核心模块 (Meeting)](./meeting/overview.md)：多平台会议元数据管理、参会人详情与组织数据隔离。
  - [会议组织归属基础](./meeting/organization-foundation.md)：多租户隔离与历史数据归属回填指南。
- [会议纪要与 AI 总结 (Minute)](./meeting/minute.md)：转写文本沉淀、AI 全文总结、参会发言人洞察与发言检索。
- [追踪报告 (Tracking Reports)](./meeting/tracking-report.md)：多周期会议与待办履约数字化追踪报表。

## 🔐 身份认证与权限管理 (IAM & Access Control)

- [认证模块概述](./iam/overview.md)：JWT + Passport 多策略认证、登录与令牌刷新。
  - [注册与邀请流程](./iam/registration-flow.md)：组织邀请加入与多阶段注册流。
  - [登出实现机制](./iam/logout-implementation.md)：令牌吊销与多端登出状态同步。
  - [联系方式换绑审计](./iam/contact-change-audit.md)：敏感手机/邮箱操作事务审计与安全通知。
- [API Key 鉴权体系](./iam/api-key.md)：面向程序化访问的凭据创建、Scope 权限校验、密钥轮换与全链路调用审计。
- [OAuth2 客户端管理](./iam/oauth.md)：企业自建应用客户端注册、密钥生成与权限授权码管理。
- [组织与成员架构](./iam/organization.md)：多租户组织生命周期、部门树结构、成员导入与 RBAC 权限体系。

## 🤖 智能体与资产基础设施 (Agent & Assets)

- [系统技能 (Skills)](./agent/skill.md)：不可变 Zip 技能包导入、校验、版本化控制与系统技能分发。
- [MCP (Model Context Protocol)](./agent/mcp.md)：向外部 Agent/IDE 暴露的原生上下文与工具连接配置指南。
- [多项目管理 (Projects)](./agent/project.md)：工作空间多项目划分、Slug 自动生成、项目级成员与权限边界。
- [云盘与文件安全](./agent/drive.md)：文件存储、Minute 录制文件管理及安全扫描策略。

## 💰 商业与交易结算 (Commerce)

- [商业与交易域](./commerce/overview.md)：商品 (Product)、渠道 (Channel)、订单 (Order)、退款 (Refund)、分账 (Profit Sharing)、Stripe 支付与微信小店接入。

---

> 跨模块全局数据流参见[模块地图](../architecture/module-map.md)；第三方平台与通讯通道参见[第三方集成](../integrations/index.md)。
