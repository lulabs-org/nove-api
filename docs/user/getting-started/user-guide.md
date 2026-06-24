# 用户指南

欢迎使用 Nove API 系统！本指南提供了系统的详细使用说明，帮助您充分利用所有功能。

## 📖 目录

1. [账户管理](#账户管理)
2. [认证与授权](#认证与授权)
3. [会议管理](#会议管理)
4. [用户资料](#用户资料)
5. [API Key 认证](#api-key-认证)
6. [错误处理](#错误处理)
7. [最佳实践](#最佳实践)

---

## 账户管理

### 用户注册

系统支持邮箱注册，注册流程如下：

```bash
# 1. 发送注册验证码
curl -X POST http://localhost:3000/verification/send-email-code \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "purpose": "REGISTER"
  }'
```

响应示例：

```json
{
  "message": "验证码已发送",
  "expiresIn": 300
}
```

### 完成注册

使用收到的验证码完成注册：

```bash
# 2. 注册用户
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "YourSecurePassword123!",
    "name": "Your Name",
    "verificationCode": "123456"
  }'
```

响应示例：

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900,
  "refreshToken": "a1b2c3d4e5...",
  "refreshExpiresIn": 604800,
  "user": {
    "id": "clxxx...",
    "email": "your-email@example.com",
    "name": "Your Name",
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

### 密码重置

忘记密码时，可以通过邮箱重置：

```bash
# 1. 发送密码重置验证码
curl -X POST http://localhost:3000/verification/send-email-code \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "purpose": "RESET_PASSWORD"
  }'

# 2. 重置密码
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "newPassword": "NewSecurePassword123!",
    "verificationCode": "123456"
  }'
```

---

## 认证与授权

### 登录

使用邮箱和密码登录：

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "YourSecurePassword123!"
  }'
```

响应示例：

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900,
  "refreshToken": "a1b2c3d4e5...",
  "refreshExpiresIn": 604800,
  "user": {
    "id": "clxxx...",
    "email": "your-email@example.com",
    "name": "Your Name"
  }
}
```

> [!NOTE]
> `expiresIn` 和 `refreshExpiresIn` 的单位均为**秒**。
> - 访问令牌默认有效期：**15 分钟**（900 秒）
> - 刷新令牌默认有效期：**7 天**（604800 秒）

### Token 刷新

访问令牌过期后，使用刷新令牌获取新的访问令牌：

```bash
curl -X POST http://localhost:3000/api/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "a1b2c3d4e5..."
  }'
```

> [!TIP]
> 系统实现了**刷新令牌轮换**（Refresh Token Rotation）：每次刷新后，旧的 refreshToken 会被立即撤销，响应中返回新的 refreshToken。请务必更新本地存储的 refreshToken。

### 登出

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "a1b2c3d4e5..."
  }'
```

支持的登出选项：
- `refreshToken`: 撤销指定的刷新令牌
- `deviceId`: 撤销指定设备的所有令牌
- `revokeAllDevices`: 设为 `true` 可撤销所有设备的令牌

### 使用 Token 访问 API

在后续请求中，使用 `Authorization` 头携带访问令牌：

```bash
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <access_token>"
```

---

## 会议管理

### 创建会议

创建新会议：

```bash
curl -X POST http://localhost:3000/meetings \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "项目讨论会",
    "description": "讨论项目进度和下一步计划",
    "startTime": "2026-07-15T10:00:00.000Z",
    "endTime": "2026-07-15T11:00:00.000Z",
    "meetingType": "REGULAR"
  }'
```

### 获取会议列表

```bash
curl "http://localhost:3000/meetings?page=1&limit=20" \
  -H "Authorization: Bearer <access_token>"
```

响应示例：

```json
{
  "data": [
    {
      "id": "meeting-123",
      "title": "项目讨论会",
      "status": "SCHEDULED",
      "startTime": "2026-07-15T10:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 20
}
```

### 获取会议详情

```bash
curl http://localhost:3000/meetings/{meetingId} \
  -H "Authorization: Bearer <access_token>"
```

### 更新会议

```bash
curl -X PUT http://localhost:3000/meetings/{meetingId} \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "更新后的会议标题",
    "description": "更新后的描述"
  }'
```

### 删除会议

```bash
curl -X DELETE http://localhost:3000/meetings/{meetingId} \
  -H "Authorization: Bearer <access_token>"
```

### 会议状态

会议有以下状态：

- `SCHEDULED` - 已安排
- `ONGOING` - 进行中
- `COMPLETED` - 已完成
- `CANCELLED` - 已取消

---

## 用户资料

### 获取个人信息

```bash
curl http://localhost:3000/api/user/profile \
  -H "Authorization: Bearer <access_token>"
```

### 更新个人信息

```bash
curl -X PUT http://localhost:3000/api/user/profile \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "avatar": "https://example.com/new-avatar.jpg"
  }'
```

---

## API Key 认证

除了 JWT Token 认证外，系统还支持通过 API Key 进行认证，适用于程序化访问场景（如脚本、CI/CD、第三方集成等）。

### 使用 API Key

在请求头中通过 `Authorization` 头携带 API Key：

```bash
curl http://localhost:3000/meetings \
  -H "Authorization: Bearer <your-api-key>"
```

> [!NOTE]
> API Key 的创建和管理需要通过系统管理界面或对应的管理 API 完成。详见 Swagger 文档中的 API Key 相关端点。

---

## 错误处理

所有 API 错误响应都遵循统一格式：

```json
{
  "statusCode": 400,
  "message": "错误描述信息",
  "error": "Bad Request"
}
```

常见错误码：

| 错误码 | 含义 | 常见原因 |
|--------|------|----------|
| `400` | 请求参数错误 | 缺少必填字段、格式不正确 |
| `401` | 未授权 | 令牌无效、过期或未提供 |
| `403` | 禁止访问 | 权限不足 |
| `404` | 资源不存在 | ID 错误或资源已删除 |
| `409` | 资源冲突 | 邮箱已注册等 |
| `429` | 请求过于频繁 | 触发速率限制 |
| `500` | 服务器内部错误 | 系统异常，请联系管理员 |

---

## 最佳实践

### 密码安全

- 使用至少 8 个字符的密码
- 包含大小写字母、数字和特殊字符
- 定期更换密码
- 不要与他人共享密码

### Token 管理

- 妥善保管访问令牌和刷新令牌
- 不要在客户端代码中硬编码令牌
- 令牌过期后及时使用 refresh-token 接口刷新
- 登出后清除本地存储的令牌
- 刷新后务必更新本地存储的 refreshToken（令牌轮换机制）

### API 使用

- 合理使用分页功能，避免一次性获取大量数据
- 遵循 API 速率限制
- 处理所有可能的错误响应
- 使用适当的 HTTP 方法（GET、POST、PUT、DELETE）

---

## 获取帮助

如果您在使用过程中遇到任何问题，请：

1. 查阅本文档的相关章节
2. 查看 [常见问题](../faq/common-questions.md)
3. 访问 [Swagger 文档](http://localhost:3000/api) 查看完整 API 细节
4. 联系系统管理员

---

**祝您使用愉快！**