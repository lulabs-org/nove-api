# 核心模块

本目录解释 Nove 自有领域模块的运行时契约。完整请求/响应字段以运行中的 Swagger 为准。

- [认证](./authentication/overview.md)：登录方式、令牌与统一认证。
- [API Key](./api-key/overview.md)：程序化凭据、Scope 和管理接口。
- [组织与成员](./org-management/overview.md)：组织、部门、成员与权限。
- [系统配置](./system-config/overview.md)：动态配置、加密字段与热更新。
- [邮件](./mail/overview.md)：SMTP 发送、连接检查与 BullMQ 延迟任务。
- [短信](./sms/overview.md)：短信验证码发送能力与验证模块的依赖边界。
- [MCP](./mcp/connection-guide.md)：MCP Server 连接和客户端配置。

跨模块关系见[模块地图](../architecture/module-map.md)；第三方平台行为见[集成](../integrations/index.md)。
