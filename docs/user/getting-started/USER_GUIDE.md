# 用户指南

欢迎使用 Nove API 系统！本指南提供了系统的详细使用说明，帮助您充分利用所有功能。

## 📖 目录

1. [账户管理](#账户管理)
2. [认证与授权](#认证与授权)
3. [会议管理](#会议管理)
4. [用户资料](#用户资料)
5. [常见问题](#常见问题)

---

## 账户管理

### 用户注册

系统支持邮箱注册，注册流程如下：

```bash
# 发送注册验证码
POST /api/v1/verification/send-email-code
Content-Type: application/json

{
  "email": "your-email@example.com",
  "purpose": "REGISTER"
}
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
# 注册用户
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "your-email@example.com",
  "password": "YourSecurePassword123!",
  "name": "Your Name",
  "verificationCode": "123456"
}
```

响应示例：

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-123",
    "email": "your-email@example.com",
    "name": "Your Name",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 密码重置

忘记密码时，可以通过邮箱重置：

```bash
# 发送密码重置验证码
POST /api/v1/verification/send-email-code
Content-Type: application/json

{
  "email": "your-email@example.com",
  "purpose": "RESET_PASSWORD"
}

# 重置密码
POST /api/v1/auth/reset-password
Content-Type: application/json

{
  "email": "your-email@example.com",
  "newPassword": "NewSecurePassword123!",
  "verificationCode": "123456"
}
```

---

## 认证与授权

### 登录

使用邮箱和密码登录：

```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "your-email@example.com",
  "password": "YourSecurePassword123!"
}
```

响应示例：

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-123",
    "email": "your-email@example.com",
    "name": "Your Name"
  }
}
```

### Token 刷新

访问令牌过期后，使用刷新令牌获取新的访问令牌：

```bash
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 登出

```bash
POST /api/v1/auth/logout
Authorization: Bearer <access_token>
```

### 使用 Token 访问 API

在后续请求中，使用 `Authorization` 头携带访问令牌：

```bash
GET /api/v1/users/profile
Authorization: Bearer <access_token>
```

---

## 会议管理

### 创建会议

创建新会议：

```bash
POST /api/v1/meetings
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "title": "项目讨论会",
  "description": "讨论项目进度和下一步计划",
  "startTime": "2024-01-15T10:00:00.000Z",
  "endTime": "2024-01-15T11:00:00.000Z",
  "meetingType": "REGULAR"
}
```

响应示例：

```json
{
  "id": "meeting-123",
  "title": "项目讨论会",
  "description": "讨论项目进度和下一步计划",
  "startTime": "2024-01-15T10:00:00.000Z",
  "endTime": "2024-01-15T11:00:00.000Z",
  "meetingType": "REGULAR",
  "status": "SCHEDULED",
  "createdAt": "2024-01-10T00:00:00.000Z",
  "host": {
    "id": "user-123",
    "name": "Your Name"
  }
}
```

### 获取会议列表

获取所有会议：

```bash
GET /api/v1/meetings
Authorization: Bearer <access_token>
```

响应示例：

```json
{
  "data": [
    {
      "id": "meeting-123",
      "title": "项目讨论会",
      "status": "SCHEDULED",
      "startTime": "2024-01-15T10:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 20
}
```

### 获取会议详情

```bash
GET /api/v1/meetings/{meetingId}
Authorization: Bearer <access_token>
```

### 更新会议

```bash
PUT /api/v1/meetings/{meetingId}
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "title": "更新后的会议标题",
  "description": "更新后的描述"
}
```

### 删除会议

```bash
DELETE /api/v1/meetings/{meetingId}
Authorization: Bearer <access_token>
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
GET /api/v1/users/profile
Authorization: Bearer <access_token>
```

响应示例：

```json
{
  "id": "user-123",
  "email": "your-email@example.com",
  "name": "Your Name",
  "avatar": "https://example.com/avatar.jpg",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-10T00:00:00.000Z"
}
```

### 更新个人信息

```bash
PUT /api/v1/users/profile
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Updated Name",
  "avatar": "https://example.com/new-avatar.jpg"
}
```

### 修改密码

```bash
PUT /api/v1/users/password
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "oldPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}
```

---

## 常见问题

### Q: 访问令牌多久过期？

A: 访问令牌的有效期为 1 小时。过期后，请使用刷新令牌获取新的访问令牌。

### Q: 如何获取验证码？

A: 通过 `/api/v1/verification/send-email-code` 接口发送验证码到您的邮箱。

### Q: 验证码多久过期？

A: 验证码的有效期为 5 分钟（300 秒）。

### Q: 可以创建多少个会议？

A: 目前没有限制，但请合理使用系统资源。

### Q: 会议录制和转写功能如何使用？

A: 会议录制和转写功能由腾讯会议提供。创建会议后，系统会自动处理录制和转写，您可以通过会议详情查看相关内容。

### Q: 如何联系技术支持？

A: 如遇到问题，请联系系统管理员或发送邮件至 support@example.com。

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

- `400` - 请求参数错误
- `401` - 未授权（令牌无效或过期）
- `403` - 禁止访问（权限不足）
- `404` - 资源不存在
- `409` - 资源冲突（如邮箱已注册）
- `429` - 请求过于频繁
- `500` - 服务器内部错误

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
- 令牌过期后及时刷新
- 登出后清除本地存储的令牌

### API 使用

- 合理使用分页功能，避免一次性获取大量数据
- 遵循 API 速率限制
- 处理所有可能的错误响应
- 使用适当的 HTTP 方法（GET、POST、PUT、DELETE）

---

## 获取帮助

如果您在使用过程中遇到任何问题，请：

1. 查阅本文档的相关章节
2. 查看错误消息和状态码
3. 联系系统管理员
4. 发送邮件至 support@example.com

---

**祝您使用愉快！**