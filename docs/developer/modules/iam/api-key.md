# API Key 鉴权体系

Nove API 采用类似 Stripe / OpenAI 的 API Key 鉴权体系，主要面向外部程序化调用、AI 智能体访问及第三方系统对接。提供多租户隔离、细粒度 Scope 权限控制、HMAC 哈希存储、密钥轮换与全链路调用审计。

## 核心设计与安全规范

- **Key 格式规范**：采用 `sk_<env>_<prefix>.<secret>` 结构（例如 `sk_live_AbCdEfGhIj.1234567890abcdef...`）。
- **零明文存储**：数据库仅保存检索用的 `prefix`、用于脱敏展示的末尾字符 `last4`，以及通过 `API_KEY_SECRET` 计算生成的 HMAC-SHA256 哈希值 `keyHash`。明文 Key 仅在创建或轮换时返回一次，无法反向解密。
- **恒定时间比对**：哈希校验时使用 `crypto.timingSafeEqual`，防止时序侧信道攻击。
- **组织多租户隔离**：每个 API Key 严格归属于创建者所在的主组织（`organizationId`），请求上下文自动注入多租户隔离边界。
- **Scope 权限控制**：支持声明式权限范围（如 `meetings:read`、`meetings:write`），结合 NestJS 守卫进行细粒度鉴权。
- **双通道请求头**：调用方支持通过 `Authorization: Bearer <key>` 或 `x-api-key: <key>` 传递凭据。
- **调用审计日志**：内置 `UsageLoggingInterceptor`，自动记录每次调用方法、路径、状态码、延迟及客户端 IP 至 `api_key_usage_logs` 表。

---

## 环境配置

在 `.env` 中配置哈希签名根密钥（必须至少 32 字符）：

```bash
# 用于 API Key HMAC-SHA256 哈希计算的根密钥
API_KEY_SECRET=your-super-secret-api-key-secret-at-least-32-chars
```

可使用 OpenSSL 快速生成安全随机密钥：

```bash
openssl rand -hex 32
```

---

## 管理端 API 接口

管理端接口路由统一位于 `/admin/api-keys`，需要有效的管理后台 JWT 认证并具备对应权限。

### 1. 创建 API Key
- **端点**：`POST /admin/api-keys`
- **权限**：`api-key:create`

```bash
curl -X POST http://localhost:3000/admin/api-keys \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production Agent Key",
    "scopes": ["meetings:read", "meetings:write"],
    "expiresAt": "2026-12-31T23:59:59Z"
  }'
```

响应示例（⚠️ **重要**：明文 `key` 仅在此响应中返回一次，请妥善保存）：
```json
{
  "id": "clx1234567890abcdef",
  "name": "Production Agent Key",
  "key": "sk_live_AbCdEfGhIj.1234567890abcdefghijklmnopqrstuvwxyz",
  "prefix": "AbCdEfGhIj",
  "last4": "wxyz",
  "status": "ACTIVE",
  "scopes": ["meetings:read", "meetings:write"],
  "expiresAt": "2026-12-31T23:59:59.000Z",
  "createdAt": "2026-01-05T00:00:00.000Z",
  "lastUsedAt": null
}
```

### 2. 查询 Key 列表
- **端点**：`GET /admin/api-keys?page=1&pageSize=10`
- **权限**：`api-key:read`

返回脱敏列表（不含密文与哈希，仅展示 `prefix` 和 `last4`）：
```json
{
  "items": [
    {
      "id": "clx1234567890abcdef",
      "name": "Production Agent Key",
      "prefix": "AbCdEfGhIj",
      "last4": "wxyz",
      "status": "ACTIVE",
      "scopes": ["meetings:read", "meetings:write"],
      "expiresAt": "2026-12-31T23:59:59.000Z",
      "createdAt": "2026-01-05T00:00:00.000Z",
      "lastUsedAt": "2026-01-05T12:30:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 10,
  "totalPages": 1
}
```

### 3. 更新 API Key
- **端点**：`PATCH /admin/api-keys/:id`
- **权限**：`api-key:update`

更新指定 Key 的名称、Scope 范围或过期时间：
```bash
curl -X PATCH http://localhost:3000/admin/api-keys/clx1234567890abcdef \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Agent Key",
    "scopes": ["meetings:read"]
  }'
```

### 4. 轮换 API Key (Key Rotation)
- **端点**：`POST /admin/api-keys/:id/rotate`
- **权限**：`api-key:rotate`

立即生成并返回新的密钥明文，继承原有名称和 Scopes，同时**自动撤销旧密钥**（平滑轮换）：
```bash
curl -X POST http://localhost:3000/admin/api-keys/clx1234567890abcdef/rotate \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"
```

### 5. 立即撤销 (Revoke)
- **端点**：`POST /admin/api-keys/:id/revoke`
- **权限**：`api-key:revoke`
- **响应**：`HTTP 204 No Content`，该密钥立即失效。

---

## 外部客户端调用

外部程序化客户端或 AI 智能体在调用受保护业务接口时，支持以下两种 Header 传入凭据：

### 方式 1：标准 Bearer Header (推荐)
```bash
curl -X GET http://localhost:3000/api/v1/meetings \
  -H "Authorization: Bearer sk_live_AbCdEfGhIj.1234567890abcdef..."
```

### 方式 2：x-api-key Header
```bash
curl -X GET http://localhost:3000/api/v1/meetings \
  -H "x-api-key: sk_live_AbCdEfGhIj.1234567890abcdef..."
```

### 常见认证错误状态码
- **401 Unauthorized**：
  ```json
  { "statusCode": 401, "message": "Invalid API key", "error": "Unauthorized" }
  ```
  原因：Key 格式错误、已被撤销、已过期或哈希校验不匹配。
- **403 Forbidden**：
  ```json
  { "statusCode": 403, "message": "Insufficient scopes", "error": "Forbidden" }
  ```
  原因：API Key 缺少当前端点声明的 Scope（例如拥有 `meetings:read` 却尝试调用 `POST /meetings`）。

---

## 开发者路由保护与守卫接入

在业务控制器中保护端点只需使用框架提供的 `@UseGuards(ApiKeyGuard, ApiScopesGuard)` 与 `@ApiScopes()`：

```typescript
import { Controller, Get, Post, Req, Body, UseGuards, UseInterceptors } from '@nestjs/common';
import { Request } from 'express';
import { ApiKeyGuard, ApiScopesGuard, ApiScopes, UsageLoggingInterceptor } from '@/admin/api-key';

@Controller('api/v1/meetings')
@UseGuards(ApiKeyGuard, ApiScopesGuard)
@UseInterceptors(UsageLoggingInterceptor) // 启用自动审计日志记录
export class MeetingsApiController {
  @Get()
  @ApiScopes('meetings:read')
  async listMeetings(@Req() req: Request) {
    // 自动获取租户上下文
    const { organizationId, apiKeyId, scopes } = req.apiAuth;
    return this.meetingService.findByOrganization(organizationId);
  }

  @Post()
  @ApiScopes('meetings:write')
  async createMeeting(@Req() req: Request, @Body() body: any) {
    const { organizationId } = req.apiAuth;
    return this.meetingService.create(organizationId, body);
  }
}
```

---

## 数据库模型架构

### 1. `api_keys` 表（密钥凭据）
| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | String | 主键（CUID） |
| `organizationId` | String | 组织 ID（强制多租户数据隔离） |
| `name` | String | 业务标识名称 |
| `prefix` | String | Key 前缀（唯一索引，用于常数级快速查找定位） |
| `keyHash` | String | HMAC-SHA256 计算后的不可逆密文 |
| `last4` | String | 密钥末 4 位（脱敏回显） |
| `status` | Enum | `ACTIVE`（可用）/ `REVOKED`（已撤销）/ `EXPIRED`（已过期） |
| `scopes` | String[] | 授权范围列表 |
| `expiresAt` | DateTime? | 过期时间（为空表示永久有效） |
| `lastUsedAt` | DateTime? | 最近一次有效调用时间 |
| `createdBy` | String? | 创建者用户 ID |
| `rotatedFromId`| String? | 轮换前驱 Key ID |

### 2. `api_key_usage_logs` 表（调用审计流水）
| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | String | 主键（CUID） |
| `apiKeyId` | String | 关联的 API Key ID |
| `organizationId` | String | 租户组织 ID |
| `method` | String | 请求 HTTP 方法（`GET` / `POST` / 等） |
| `path` | String | 请求 URL 路径 |
| `statusCode` | Int | 响应 HTTP 状态码 |
| `latencyMs` | Int | 请求全链路耗时（毫秒） |
| `ip` | String? | 客户端真实 IP |
| `error` | String? | 错误信息（若发生异常） |
| `createdAt` | DateTime | 记录时间 |
