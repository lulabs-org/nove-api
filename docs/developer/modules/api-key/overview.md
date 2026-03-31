# API Key Management Module

类似 OpenAI/DeepSeek 的 API Key 管理平台模块，支持多租户、权限范围控制、密钥轮换和使用审计。

## 功能特性

- ✅ **管理端接口**：创建、列表、更新、撤销、轮换 API Key
- ✅ **外部 API 认证**：支持 `Authorization: Bearer` 和 `x-api-key` 两种方式
- ✅ **Scope 权限控制**：细粒度的资源访问控制
- ✅ **多租户隔离**：基于 Organization 的完全隔离
- ✅ **安全设计**：HMAC-SHA256 哈希、明文仅返回一次、常量时间比较
- ✅ **审计日志**：完整的使用记录和错误追踪
- ✅ **密钥轮换**：支持无缝密钥更新
- ✅ **过期管理**：自动过期检测

## 快速开始

### 1. 环境配置

在 `.env` 文件中添加：

```bash
# API Key 哈希密钥（必须至少 32 字符）
API_KEY_SECRET=your-super-secret-api-key-secret-change-this-in-production
```

生成强随机密钥：

```bash
# 方法 1: Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 方法 2: OpenSSL
openssl rand -hex 64
```

### 2. 数据库迁移

模块已包含 Prisma 迁移文件，运行：

```bash
pnpm db:migrate
```

### 3. 模块已注册

`ApiKeyModule` 已在 `AppModule` 中注册，无需额外配置。

## 管理端 API

### 创建 API Key

```bash
POST /admin/api-keys
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "Production API Key",
  "scopes": ["meetings:read", "meetings:write"],
  "expiresAt": "2026-12-31T23:59:59Z"  // 可选
}
```

响应（明文 key 仅返回一次）：

```json
{
  "id": "clx1234567890abcdef",
  "name": "Production API Key",
  "key": "sk_prod_AbCdEfGhIj.1234567890abcdefghijklmnopqrstuvwxyz",
  "prefix": "AbCdEfGhIj",
  "last4": "wxyz",
  "status": "ACTIVE",
  "scopes": ["meetings:read", "meetings:write"],
  "expiresAt": "2026-12-31T23:59:59.000Z",
  "createdAt": "2026-01-05T00:00:00.000Z",
  "lastUsedAt": null
}
```

### 列出 API Keys

```bash
GET /admin/api-keys?page=1&pageSize=10
Authorization: Bearer <jwt_token>
```

### 更新 API Key

```bash
PATCH /admin/api-keys/:id
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "Updated Name",
  "scopes": ["meetings:read"],
  "expiresAt": "2027-12-31T23:59:59Z"
}
```

### 撤销 API Key

```bash
POST /admin/api-keys/:id/revoke
Authorization: Bearer <jwt_token>
```

### 轮换 API Key

```bash
POST /admin/api-keys/:id/rotate
Authorization: Bearer <jwt_token>
```

响应包含新的明文 key（仅返回一次），旧 key 自动撤销。

## 外部 API 使用

### 认证方式

**方式 1：Authorization Header**

```bash
GET /v1/me
Authorization: Bearer sk_prod_AbCdEfGhIj.1234567890abcdefghijklmnopqrstuvwxyz
```

**方式 2：x-api-key Header**

```bash
GET /v1/me
x-api-key: sk_prod_AbCdEfGhIj.1234567890abcdefghijklmnopqrstuvwxyz
```

### 演示端点

```bash
GET /v1/me
```

响应：

```json
{
  "organizationId": "clx1234567890abcdef",
  "apiKeyId": "clx0987654321fedcba",
  "scopes": ["meetings:read", "meetings:write"]
}
```

## 在其他模块中使用

### 1. 保护路由

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiKeyGuard, ApiScopesGuard, ApiScopes } from '@/api-key';

@Controller('meetings')
@UseGuards(ApiKeyGuard, ApiScopesGuard)
export class MeetingsController {
  @Get()
  @ApiScopes('meetings:read')
  async getMeetings() {
    // 只有具有 meetings:read scope 的 API Key 才能访问
    return [];
  }

  @Post()
  @ApiScopes('meetings:write', 'meetings:create')
  async createMeeting() {
    // 需要同时具有 meetings:write 和 meetings:create scopes
    return {};
  }
}
```

### 2. 获取认证上下文

```typescript
import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';

@Controller('meetings')
export class MeetingsController {
  @Get()
  async getMeetings(@Req() request: Request) {
    const { organizationId, apiKeyId, scopes } = request.apiAuth;
    
    // 使用 organizationId 进行多租户隔离
    return this.meetingService.findByOrganization(organizationId);
  }
}
```

### 3. 启用使用日志

```typescript
import { Controller, UseInterceptors } from '@nestjs/common';
import { UsageLoggingInterceptor } from '@/api-key';

@Controller('meetings')
@UseInterceptors(UsageLoggingInterceptor)
export class MeetingsController {
  // 所有请求都会被记录到 api_key_usage_logs 表
}
```

## 安全最佳实践

### 1. 密钥管理

- ✅ 使用强随机密钥（至少 32 字符）
- ✅ 定期轮换 `API_KEY_SECRET`
- ✅ 生产环境使用环境变量或密钥管理服务
- ❌ 不要在代码中硬编码密钥

### 2. API Key 使用

- ✅ 明文 key 仅在创建/轮换时返回一次
- ✅ 使用 HTTPS 传输 API Key
- ✅ 为不同用途创建不同的 API Key
- ✅ 定期轮换 API Key
- ❌ 不要在客户端代码中暴露 API Key
- ❌ 不要在日志中记录完整 API Key

### 3. 权限控制

- ✅ 遵循最小权限原则
- ✅ 为不同场景使用不同的 scopes
- ✅ 定期审查 API Key 权限
- ✅ 及时撤销不再使用的 API Key

### 4. 监控和审计

- ✅ 定期检查使用日志
- ✅ 监控异常访问模式
- ✅ 设置过期时间
- ✅ 启用告警机制

## 数据库表结构

### api_keys

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 主键 |
| organizationId | String | 组织 ID（多租户） |
| name | String | Key 名称 |
| prefix | String | Key 前缀（唯一，用于快速查找） |
| keyHash | String | Key 的 HMAC-SHA256 哈希 |
| last4 | String | Key 最后 4 位（用于显示） |
| status | Enum | ACTIVE / REVOKED / EXPIRED |
| scopes | String[] | 权限范围 |
| expiresAt | DateTime? | 过期时间 |
| revokedAt | DateTime? | 撤销时间 |
| lastUsedAt | DateTime? | 最后使用时间 |
| createdBy | String? | 创建者用户 ID |
| rotatedFromId | String? | 轮换来源 Key ID |
| createdAt | DateTime | 创建时间 |
| updatedAt | DateTime | 更新时间 |

### api_key_usage_logs

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 主键 |
| apiKeyId | String | API Key ID |
| organizationId | String | 组织 ID |
| method | String | HTTP 方法 |
| path | String | 请求路径 |
| statusCode | Int | HTTP 状态码 |
| latencyMs | Int | 请求延迟（毫秒） |
| ip | String? | 客户端 IP |
| userAgent | String? | User-Agent |
| error | String? | 错误信息 |
| createdAt | DateTime | 创建时间 |

## 扩展功能（未来）

- [ ] 配额管理（每日/每月请求限制）
- [ ] 速率限制（每秒/每分钟请求限制）
- [ ] IP 白名单
- [ ] Scope 层级结构（通配符支持）
- [ ] Webhook 通知
- [ ] 使用统计仪表板
- [ ] 自动过期提醒
- [ ] 子 Key 创建（委托模式）

## 故障排查

### API Key 认证失败

1. 检查 key 格式是否正确：`sk_<env>_<prefix>.<secret>`
2. 确认 key 状态为 ACTIVE
3. 检查是否已过期
4. 验证 `API_KEY_SECRET` 配置正确

### Scope 权限不足

1. 检查 API Key 的 scopes 字段
2. 确认路由所需的 scopes
3. 更新 API Key 的 scopes 或创建新 Key

### 使用日志未记录

1. 确认已应用 `UsageLoggingInterceptor`
2. 检查数据库连接
3. 查看应用日志中的错误信息

## 技术栈

- **NestJS**: Web 框架
- **Prisma**: ORM
- **PostgreSQL**: 数据库
- **Node.js crypto**: 加密和哈希
- **class-validator**: DTO 验证
- **Swagger**: API 文档

## 许可证

Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
