# 快速开始

欢迎使用 Nove API 系统！本指南将帮助您在 5 分钟内快速上手使用系统。

## 📋 前置条件

在开始使用系统之前，请确保您具备以下条件：

- 有效的用户账号（如无账号，请联系管理员）
- 能够访问系统 API 的网络连接
- 了解基本的 API 调用概念（可选，有客户端工具更佳）

## 🚀 快速开始步骤

### 1. 获取访问凭证

首先，您需要获取 API 访问凭证：

```bash
# 使用您的邮箱和密码登录
POST /api/auth/login
Content-Type: application/json

{
  "email": "your-email@example.com",
  "password": "your-password"
}
```

响应示例：

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-123",
    "email": "your-email@example.com",
    "name": "Your Name"
  }
}
```

**重要提示**: 请妥善保存 `accessToken`，后续所有 API 请求都需要在请求头中携带此令牌。

### 2. 使用 API 访问令牌

在后续的 API 请求中，您需要在请求头中添加访问令牌：

```bash
# 请求头格式
Authorization: Bearer <your-access-token>
```

示例：

```bash
# 获取用户信息
GET /api/users/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. 创建您的第一个会议

```bash
# 创建会议
POST /api/meetings
Authorization: Bearer <your-access-token>
Content-Type: application/json

{
  "title": "我的第一个会议",
  "platform": "TENCENT_MEETING",
  "startTime": "2024-01-15T10:00:00Z",
  "endTime": "2024-01-15T11:00:00Z",
  "description": "这是一个测试会议"
}
```

响应示例：

```json
{
  "id": "meeting-123",
  "title": "我的第一个会议",
  "platform": "TENCENT_MEETING",
  "meetingId": "123456789",
  "meetingCode": "123456789",
  "startTime": "2024-01-15T10:00:00Z",
  "endTime": "2024-01-15T11:00:00Z",
  "status": "SCHEDULED"
}
```

### 4. 查看会议列表

```bash
# 获取会议列表
GET /api/meetings?page=1&limit=10
Authorization: Bearer <your-access-token>
```

## 📖 常用 API 端点

### 认证相关

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/auth/register` | POST | 用户注册 |
| `/api/auth/login` | POST | 用户登录 |
| `/api/auth/logout` | POST | 用户登出 |
| `/api/auth/refresh` | POST | 刷新访问令牌 |

### 用户相关

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/users/profile` | GET | 获取当前用户信息 |
| `/api/users/profile` | PUT | 更新用户信息 |

### 会议相关

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/meetings` | GET | 获取会议列表 |
| `/api/meetings` | POST | 创建会议 |
| `/api/meetings/:id` | GET | 获取会议详情 |
| `/api/meetings/:id` | PUT | 更新会议 |
| `/api/meetings/:id` | DELETE | 删除会议 |

## 🛠️ 推荐工具

### API 测试工具

- **Postman**: 强大的 API 测试工具，支持环境变量和自动化测试
- **Insomnia**: 轻量级 API 客户端，界面简洁
- **cURL**: 命令行工具，适合快速测试
- **HTTPie**: 友好的命令行 HTTP 客户端

### Postman 集合

您可以导入我们的 Postman 集合来快速开始：

1. 下载 Postman 集合文件（请联系管理员获取）
2. 在 Postman 中导入集合
3. 配置环境变量（base_url、access_token）
4. 开始测试 API

## 💡 使用技巧

### 1. 令牌刷新

访问令牌有过期时间（默认 24 小时），过期后需要刷新：

```bash
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

### 2. 错误处理

API 返回的错误格式：

```json
{
  "statusCode": 400,
  "message": "Bad Request",
  "error": "Validation failed"
}
```

常见错误码：
- `400`: 请求参数错误
- `401`: 未授权（令牌无效或过期）
- `403`: 禁止访问（权限不足）
- `404`: 资源不存在
- `500`: 服务器内部错误

### 3. 分页查询

支持分页的接口使用以下参数：

- `page`: 页码（从 1 开始）
- `limit`: 每页数量（默认 10，最大 100）

示例：

```bash
GET /api/meetings?page=2&limit=20
```

## 📚 下一步

恭喜您已经完成了快速开始！接下来您可以：

1. 阅读 [用户指南](user-guide.md) 了解更多功能
2. 查看 [API 文档](../api/) 了解所有可用的 API
3. 查看 [常见问题](../faq/common-questions.md) 解决常见问题

## ❓ 需要帮助？

如果您在使用过程中遇到任何问题：

1. 查看 [常见问题](../faq/common-questions.md)
2. 查看 [完整 API 文档](#)
3. 联系技术支持团队

---

**提示**: 本指南仅涵盖基本功能，更多高级功能请参考详细文档。
