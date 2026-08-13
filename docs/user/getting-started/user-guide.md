# 用户指南

本指南说明 Nove API 的通用调用方式。由于接口由 NestJS 装饰器实时生成，字段、枚举和权限要求应以 Swagger (`http://localhost:3000/api`) 为最终依据。

## 认证模式

登录接口 `POST /api/auth/login` 根据 `type` 选择凭据：

- `username_password`
- `email_password` / `email_code`
- `phone_password` / `phone_code`

`clientType` 为 `app` 时，访问令牌和刷新令牌均在响应体中返回；为 `web` 时，刷新令牌写入 HttpOnly Cookie，响应体只返回访问令牌。示例见[快速开始](./quick-start.md)。

验证码接口为：

- `POST /api/auth/otp/send`：发送邮箱或手机验证码。
- `POST /api/auth/otp/verify`：校验验证码。

请求体使用 `target`、`type`、`code` 和可选 `countryCode`，不要沿用旧的 `/verification/send-email-code` 路由。

## 令牌生命周期

- Bearer Token：`Authorization: Bearer <access-token>`。
- 刷新：`POST /api/auth/refresh-token`。App 传请求体，Web 携带 Cookie。
- 登出：`POST /api/auth/logout`，需要当前 Access Token；可选撤销指定 Refresh Token、设备或全部设备。
- 当前用户：`GET /api/auth/me`；权限列表：`GET /api/auth/permissions`。

刷新成功后应立即替换客户端保存的令牌。不要把令牌写入日志、URL、源码或公开的错误报告。

## 权限与组织上下文

系统同时检查认证、API Key Scope 和 RBAC 权限。常见结果：

| 状态码 | 含义 | 处理方式 |
|---:|---|---|
| 400 | DTO 字段缺失、未知或格式错误 | 对照 Swagger；全局校验会拒绝白名单外字段 |
| 401 | 未提供或无效凭据 | 登录/刷新并重新发送 Bearer Token |
| 403 | 已认证但 Scope/权限不足 | 切换组织或联系管理员授权 |
| 404 | 资源不存在或已软删除 | 检查 ID 与当前组织 |
| 409 | 唯一字段或成员关系冲突 | 检查邮箱、手机号、工号等 |
| 429 | 命中全局限流 | 降低请求频率后重试 |

登录响应中的 `currentOrgId` 是当前组织上下文。管理接口通常位于 `/admin`，并要求明确权限码。

## 会议数据

会议主资源位于 `/meetings`，需要 `meeting:read/create/update/delete` 等权限。相关子资源包括：

- `/recordings`：录制记录与转写读取。
- `/transcripts`：转写资源。
- `/meetings/:meetingId/summaries`：会议总结 CRUD。
- `/meetings/:meetingId/recordings/:recordingId/participant-summaries`：录制级参会者总结 CRUD。
- `/meet-ai/recordings/:recordingId/participant-summaries/generate`：生成录制级参会者总结。
- `/tracking-reports`：用户长期追踪报告 CRUD，支持周期会议总结、培养方案、项目进展和用户画像。
- `/meet-ai/summaries/period`：触发周期总结。

创建会议至少需要 `platform`、`platformMeetingId`、`title`、`type` 和 `hostUserName`。时间字段必须包含时区，建议使用 `Date.toISOString()` 生成 UTC ISO 8601 字符串。

## API Key

API Key 适用于服务间或自动化访问，仍受 Scope 和权限限制。它不是管理员 JWT 的无限权限替代品。创建后仅在安全位置保存原始值，轮换完成后及时撤销旧 Key，并按最小权限配置 Scope。

## API 与工具入口

- Swagger UI：`http://localhost:3000/api`
- OpenAPI JSON：`http://localhost:3000/api-json`
- Redoc：`http://localhost:3000/docs`
- GraphQL：`http://localhost:3000/graphql`（生产环境关闭 Playground/introspection）

遇到问题先查看[常见问题](../faq/common-questions.md)；开发和集成细节见[开发者文档](../../developer/index.md)。
