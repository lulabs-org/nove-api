# 快速开始

欢迎使用 Nove API 系统！本指南将帮助您在 5 分钟内快速上手使用系统。

## 📋 前置条件

在开始使用系统之前，请确保您具备以下条件：

- 有效的用户账号（如无账号，请联系管理员或自行注册）
- 能够访问系统 API 的网络连接
- 了解基本的 API 调用概念（可选，有客户端工具更佳）

## 🚀 快速开始步骤

### 1. 获取访问凭证

首先，使用您的邮箱和密码登录：

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-password"
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

> [!IMPORTANT]
> 请妥善保存 `accessToken`，后续所有 API 请求都需要在请求头中携带此令牌。
> 访问令牌默认有效期为 **15 分钟**（`expiresIn` 字段单位为秒），过期后需要使用 `refreshToken` 刷新。

### 2. 使用 API 访问令牌

在后续的 API 请求中，在请求头中添加访问令牌：

```bash
# 获取当前用户信息
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <your-access-token>"
```

### 3. 创建您的第一个会议

```bash
curl -X POST http://localhost:3000/meetings \
  -H "Authorization: Bearer <your-access-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "我的第一个会议",
    "platform": "TENCENT_MEETING",
    "startTime": "2026-07-15T10:00:00Z",
    "endTime": "2026-07-15T11:00:00Z",
    "description": "这是一个测试会议"
  }'
```

### 4. 查看会议列表

```bash
curl http://localhost:3000/meetings?page=1&limit=10 \
  -H "Authorization: Bearer <your-access-token>"
```

## 📖 常用 API 端点

### 认证相关

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/auth/register` | POST | 用户注册 |
| `/api/auth/login` | POST | 用户登录 |
| `/api/auth/logout` | POST | 用户登出 |
| `/api/auth/refresh-token` | POST | 刷新访问令牌 |
| `/api/auth/me` | GET | 获取当前用户信息 |
| `/api/auth/reset-password` | POST | 重置密码 |

### 用户相关

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/user/profile` | GET | 获取用户档案 |
| `/api/user/profile` | PUT | 更新用户档案 |

### 会议相关

| 端点 | 方法 | 描述 |
|------|------|------|
| `/meetings` | GET | 获取会议列表 |
| `/meetings` | POST | 创建会议 |
| `/meetings/:id` | GET | 获取会议详情 |
| `/meetings/:id` | PUT | 更新会议 |
| `/meetings/:id` | DELETE | 删除会议 |

> [!TIP]
> 以上仅为部分端点。完整的 API 文档请通过 Swagger UI 查看：启动项目后访问 [http://localhost:3000/api](http://localhost:3000/api)。

## 🛠️ 推荐工具

### 在线交互文档

启动项目后，可直接使用以下在线文档进行 API 测试：

- **Swagger UI** — [http://localhost:3000/api](http://localhost:3000/api) — 支持在页面上直接发起请求（点击 "Try it out"）
- **Redoc** — [http://localhost:3000/docs](http://localhost:3000/docs) — 纯阅读式 API 参考文档

> 在 Swagger UI 中使用认证：点击页面顶部的 🔒 **Authorize** 按钮，输入 `Bearer <your-access-token>` 即可。

### 其他 API 测试工具

- **Postman**: 强大的 API 测试工具，支持环境变量和自动化测试
- **Insomnia**: 轻量级 API 客户端，界面简洁
- **cURL**: 命令行工具，适合快速测试
- **HTTPie**: 友好的命令行 HTTP 客户端

## 💡 使用技巧

### 1. 令牌刷新

访问令牌默认有效期为 **15 分钟**（可通过环境变量 `JWT_EXPIRES_IN` 配置），过期后需要使用刷新令牌获取新的访问令牌：

```bash
curl -X POST http://localhost:3000/api/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "your-refresh-token"
  }'
```

刷新令牌默认有效期为 **7 天**（可通过环境变量 `JWT_REFRESH_EXPIRES_IN` 配置）。

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
- `429`: 请求过于频繁
- `500`: 服务器内部错误

### 3. 分页查询

支持分页的接口使用以下参数：

- `page`: 页码（从 1 开始）
- `limit`: 每页数量（默认 10，最大 100）

示例：

```bash
curl "http://localhost:3000/meetings?page=2&limit=20" \
  -H "Authorization: Bearer <your-access-token>"
```

## 📚 下一步

恭喜您已经完成了快速开始！接下来您可以：

1. 阅读 [用户指南](user-guide.md) 了解更多功能
2. 查看 [API 文档](../api/) 了解所有可用的 API
3. 查看 [常见问题](../faq/common-questions.md) 解决常见问题

## ❓ 需要帮助？

如果您在使用过程中遇到任何问题：

1. 查看 [常见问题](../faq/common-questions.md)
2. 访问 [Swagger 文档](http://localhost:3000/api) 了解完整 API 细节
3. 联系技术支持团队

---

**提示**: 本指南仅涵盖基本功能，更多高级功能请参考详细文档。
