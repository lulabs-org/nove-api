# 快速开始

本指南使用本地默认端口演示登录、认证请求和会议查询。先由开发或运维人员启动 API：

```bash
pnpm start:dev
```

启动后打开 `http://localhost:3000/api`，以 Swagger 展示的当前 DTO 为准。

## 1. 登录

登录必须传 `type`。App 客户端会在响应体返回刷新令牌；Web 客户端传 `"clientType": "web"` 时，刷新令牌写入 HttpOnly Cookie。

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "email_password",
    "email": "your-email@example.com",
    "password": "your-password",
    "clientType": "app"
  }'
```

```json
{
  "accessToken": "<jwt>",
  "expiresIn": 900,
  "refreshToken": "<refresh-token>",
  "refreshExpiresIn": 2592000,
  "user": {
    "id": "<user-id>",
    "name": "Example User",
    "roles": ["USER"],
    "currentOrgId": "<org-id>"
  }
}
```

## 2. 验证当前身份

```bash
curl http://localhost:3000/api/auth/me \
  -H 'Authorization: Bearer <access-token>'
```

接口还会经过 Scope 与权限守卫。有效令牌不等于拥有所有业务权限；403 表示当前身份缺少目标权限。

## 3. 查询会议

拥有 `meeting:read` 权限后：

```bash
curl 'http://localhost:3000/meetings?page=1&limit=10' \
  -H 'Authorization: Bearer <access-token>'
```

创建会议需要 `meeting:create` 权限，并包含平台侧标识、会议类型和主持人名称：

```bash
curl -X POST http://localhost:3000/meetings \
  -H 'Authorization: Bearer <access-token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "platform": "TENCENT_MEETING",
    "platformMeetingId": "meeting_123456",
    "title": "项目讨论会",
    "type": "SCHEDULED",
    "hostUserName": "张三",
    "actualStartAt": "2026-08-12T02:00:00.000Z"
  }'
```

## 4. 刷新与登出

App 客户端将刷新令牌放入请求体：

```bash
curl -X POST http://localhost:3000/api/auth/refresh-token \
  -H 'Content-Type: application/json' \
  -d '{"refreshToken":"<refresh-token>","clientType":"app"}'
```

Web 客户端应携带 Cookie，并在请求体传 `clientType: web`。登出接口为 `POST /api/auth/logout`，需要 Bearer Token，可选撤销当前刷新令牌或全部设备。

## API 入口

- Swagger UI：`http://localhost:3000/api`
- OpenAPI JSON：`http://localhost:3000/api-json`
- Redoc：`http://localhost:3000/docs`
- GraphQL：`http://localhost:3000/graphql`

下一步可阅读[用户指南](./user-guide.md)、[API 文档总览](../api/index.md)和[常见问题](../faq/common-questions.md)。
