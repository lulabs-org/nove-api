# 常见问题

## 🔐 认证与账户

### Q: 访问令牌多久过期？

**A:** 访问令牌（Access Token）默认有效期为 **15 分钟**。过期后，请使用刷新令牌（Refresh Token）调用 `POST /api/auth/refresh-token` 接口获取新的访问令牌。

### Q: 刷新令牌多久过期？

**A:** 刷新令牌（Refresh Token）默认有效期为 **7 天**。过期后需要重新登录。系统实现了刷新令牌轮换机制，每次刷新都会返回新的 refreshToken，旧的立即失效。

### Q: 如何获取注册/重置密码的验证码？

**A:** 通过 `POST /verification/send-email-code` 接口发送验证码到您的邮箱。验证码的有效期为 **5 分钟**（300 秒），每个邮箱有发送频率限制。

### Q: 返回 401 错误怎么办？

**A:** 401 表示未授权，常见原因包括：
- 令牌已过期 → 使用 refresh-token 接口刷新
- 令牌格式错误 → 确认请求头格式为 `Authorization: Bearer <token>`
- 令牌已被撤销（如已登出）→ 重新登录获取新令牌

### Q: 如何在多个设备上登录？

**A:** 系统支持多设备同时登录。每次登录会生成独立的令牌对。登出时可以选择仅登出当前设备或通过 `revokeAllDevices: true` 登出所有设备。

---

## 📊 API 使用

### Q: 如何查看完整的 API 文档？

**A:** 启动项目后访问以下地址：
- Swagger UI：`http://localhost:3000/api`（支持在线调试）
- Redoc：`http://localhost:3000/docs`（阅读式文档）
- GraphQL：`http://localhost:3000/graphql`（交互式查询）

详见 [API 接口文档总览](../api/index.md)。

### Q: 分页接口如何使用？

**A:** 支持分页的接口使用 `page`（页码，从 1 开始）和 `limit`（每页数量，默认 10，最大 100）参数。示例：`GET /meetings?page=2&limit=20`。

### Q: API Key 和 JWT Token 有什么区别？

**A:**
| 特性 | JWT Token | API Key |
|------|-----------|---------|
| 适用场景 | 用户登录后的交互式访问 | 程序化/自动化访问 |
| 获取方式 | 通过 login 接口 | 通过管理界面或 API 创建 |
| 有效期 | 15 分钟（可刷新） | 长期有效（可手动撤销） |
| 权限范围 | 用户完整权限 | 可配置的受限权限 |

---

## 🎥 会议功能

### Q: 支持哪些会议平台？

**A:** 目前系统深度集成了以下平台：
- **腾讯会议** — 支持会议创建、事件回调、录制文件获取、AI 转写与总结
- **飞书会议** — 支持事件回调与多维表格数据同步

### Q: 会议录制和转写功能如何使用？

**A:** 会议录制和转写由集成的会议平台（如腾讯会议）自动提供。录制完成后，系统会自动接收 Webhook 通知、下载录制文件，并可通过 AI 模块进行内容转写和总结。您可以通过会议详情 API 查看相关内容。

---

## 🔧 其他

### Q: 系统支持 GraphQL 吗？

**A:** 是的。系统同时提供 RESTful API 和 GraphQL 接口。GraphQL 端点为 `/graphql`，启动项目后可通过 GraphQL Playground 进行交互式查询。

### Q: 如何通过 MCP 连接 AI 工具？

**A:** 系统内置了 MCP (Model Context Protocol) Server。外部 AI 工具（如支持 MCP 的大语言模型客户端）可以通过 SSE 或 HTTP 方式连接，直接查询和操作系统数据。详细配置请参考[开发者文档 - MCP 连接指南](../../developer/modules/mcp/connection-guide.md)。

### Q: 遇到问题如何获取帮助？

**A:**
1. 查看本 FAQ 页面
2. 查看 [Swagger 文档](http://localhost:3000/api) 了解 API 细节
3. 查看 [用户指南](../getting-started/user-guide.md) 了解详细用法
4. 联系系统管理员
