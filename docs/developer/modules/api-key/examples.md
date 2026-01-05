# API Key Management - cURL 示例

## 前提条件

1. 确保服务器正在运行：`pnpm start:dev`
2. 已配置 `API_KEY_SECRET` 环境变量
3. 已运行数据库迁移：`pnpm db:migrate`
4. 拥有有效的 JWT token（用于管理端接口）

## 管理端 API 示例

### 1. 创建 API Key

```bash
curl -X POST http://localhost:3000/admin/api-keys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Production API Key",
    "scopes": ["meetings:read", "meetings:write"],
    "expiresAt": "2026-12-31T23:59:59Z"
  }'
```

响应示例：

```json
{
  "id": "clx1234567890abcdef",
  "name": "Production API Key",
  "key": "sk_development_AbCdEfGhIj.1234567890abcdefghijklmnopqrstuvwxyz",
  "prefix": "AbCdEfGhIj",
  "last4": "wxyz",
  "status": "ACTIVE",
  "scopes": ["meetings:read", "meetings:write"],
  "expiresAt": "2026-12-31T23:59:59.000Z",
  "createdAt": "2026-01-05T00:00:00.000Z",
  "lastUsedAt": null
}
```

⚠️ **重要**：保存返回的 `key` 字段，这是唯一一次可以看到完整密钥！

### 2. 列出所有 API Keys

```bash
curl -X GET "http://localhost:3000/admin/api-keys?page=1&pageSize=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

响应示例：

```json
{
  "items": [
    {
      "id": "clx1234567890abcdef",
      "name": "Production API Key",
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

```bash
curl -X PATCH http://localhost:3000/admin/api-keys/clx1234567890abcdef \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Production Key",
    "scopes": ["meetings:read"],
    "expiresAt": "2027-12-31T23:59:59Z"
  }'
```

### 4. 撤销 API Key

```bash
curl -X POST http://localhost:3000/admin/api-keys/clx1234567890abcdef/revoke \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

响应：HTTP 204 No Content

### 5. 轮换 API Key

```bash
curl -X POST http://localhost:3000/admin/api-keys/clx1234567890abcdef/rotate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

响应示例：

```json
{
  "id": "clx9876543210fedcba",
  "name": "Production API Key",
  "key": "sk_development_KlMnOpQrSt.abcdefghijklmnopqrstuvwxyz1234567890",
  "prefix": "KlMnOpQrSt",
  "last4": "7890",
  "status": "ACTIVE",
  "scopes": ["meetings:read", "meetings:write"],
  "expiresAt": "2026-12-31T23:59:59.000Z",
  "createdAt": "2026-01-05T13:00:00.000Z",
  "lastUsedAt": null,
  "oldKeyId": "clx1234567890abcdef"
}
```

⚠️ **重要**：保存新的 `key` 字段，旧密钥已自动撤销！

## 外部 API 示例

### 方式 1：使用 Authorization Header

```bash
curl -X GET http://localhost:3000/v1/me \
  -H "Authorization: Bearer sk_development_AbCdEfGhIj.1234567890abcdefghijklmnopqrstuvwxyz"
```

### 方式 2：使用 x-api-key Header

```bash
curl -X GET http://localhost:3000/v1/me \
  -H "x-api-key: sk_development_AbCdEfGhIj.1234567890abcdefghijklmnopqrstuvwxyz"
```

响应示例：

```json
{
  "organizationId": "clx1234567890abcdef",
  "apiKeyId": "clx0987654321fedcba",
  "scopes": ["meetings:read", "meetings:write"]
}
```

## 错误响应示例

### 401 Unauthorized - API Key 无效

```bash
curl -X GET http://localhost:3000/v1/me \
  -H "Authorization: Bearer invalid_key"
```

响应：

```json
{
  "statusCode": 401,
  "message": "Invalid API key",
  "error": "Unauthorized"
}
```

### 401 Unauthorized - API Key 已过期

```json
{
  "statusCode": 401,
  "message": "API key has expired",
  "error": "Unauthorized"
}
```

### 403 Forbidden - 权限不足

```bash
curl -X POST http://localhost:3000/v1/meetings \
  -H "Authorization: Bearer sk_development_AbCdEfGhIj.1234567890abcdefghijklmnopqrstuvwxyz"
```

响应（如果 API Key 没有 `meetings:write` scope）：

```json
{
  "statusCode": 403,
  "message": "Insufficient scopes",
  "error": "Forbidden"
}
```

### 404 Not Found - API Key 不存在

```bash
curl -X PATCH http://localhost:3000/admin/api-keys/non_existent_id \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "New Name"}'
```

响应：

```json
{
  "statusCode": 404,
  "message": "API Key not found",
  "error": "Not Found"
}
```

## 测试工作流

### 完整测试流程

```bash
# 1. 创建 API Key
API_KEY_RESPONSE=$(curl -s -X POST http://localhost:3000/admin/api-keys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Key",
    "scopes": ["meetings:read"]
  }')

# 2. 提取 API Key
API_KEY=$(echo $API_KEY_RESPONSE | jq -r '.key')
echo "Created API Key: $API_KEY"

# 3. 使用 API Key 访问外部 API
curl -X GET http://localhost:3000/v1/me \
  -H "Authorization: Bearer $API_KEY"

# 4. 提取 API Key ID
API_KEY_ID=$(echo $API_KEY_RESPONSE | jq -r '.id')

# 5. 列出所有 Keys
curl -X GET http://localhost:3000/admin/api-keys \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 6. 更新 Key
curl -X PATCH http://localhost:3000/admin/api-keys/$API_KEY_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Test Key"}'

# 7. 轮换 Key
NEW_KEY_RESPONSE=$(curl -s -X POST http://localhost:3000/admin/api-keys/$API_KEY_ID/rotate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN")

NEW_API_KEY=$(echo $NEW_KEY_RESPONSE | jq -r '.key')
echo "New API Key: $NEW_API_KEY"

# 8. 验证旧 Key 已失效
curl -X GET http://localhost:3000/v1/me \
  -H "Authorization: Bearer $API_KEY"
# 应该返回 401 Unauthorized

# 9. 验证新 Key 可用
curl -X GET http://localhost:3000/v1/me \
  -H "Authorization: Bearer $NEW_API_KEY"
# 应该返回成功

# 10. 撤销 Key
NEW_API_KEY_ID=$(echo $NEW_KEY_RESPONSE | jq -r '.id')
curl -X POST http://localhost:3000/admin/api-keys/$NEW_API_KEY_ID/revoke \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 11. 验证已撤销的 Key 无法使用
curl -X GET http://localhost:3000/v1/me \
  -H "Authorization: Bearer $NEW_API_KEY"
# 应该返回 401 Unauthorized
```

## 使用 Postman/Insomnia

### 环境变量设置

```json
{
  "base_url": "http://localhost:3000",
  "jwt_token": "YOUR_JWT_TOKEN",
  "api_key": "sk_development_AbCdEfGhIj.1234567890abcdefghijklmnopqrstuvwxyz"
}
```

### 请求集合

1. **Admin - Create API Key**
   - Method: POST
   - URL: `{{base_url}}/admin/api-keys`
   - Headers: `Authorization: Bearer {{jwt_token}}`
   - Body: JSON

2. **Admin - List API Keys**
   - Method: GET
   - URL: `{{base_url}}/admin/api-keys?page=1&pageSize=10`
   - Headers: `Authorization: Bearer {{jwt_token}}`

3. **External - Get Me**
   - Method: GET
   - URL: `{{base_url}}/v1/me`
   - Headers: `Authorization: Bearer {{api_key}}`

## 故障排查

### 问题：401 Unauthorized

**可能原因**：
1. API Key 格式错误
2. API Key 已过期
3. API Key 已撤销
4. `API_KEY_SECRET` 配置不正确

**解决方法**：
```bash
# 检查 API Key 格式
echo $API_KEY | grep -E '^sk_\w+_[^.]+\..+$'

# 检查环境变量
echo $API_KEY_SECRET

# 查看数据库中的 Key 状态
# 使用 Prisma Studio: pnpm db:studio
```

### 问题：403 Forbidden

**可能原因**：
API Key 缺少所需的 scopes

**解决方法**：
```bash
# 更新 API Key 的 scopes
curl -X PATCH http://localhost:3000/admin/api-keys/$API_KEY_ID \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "scopes": ["meetings:read", "meetings:write", "users:read"]
  }'
```

### 问题：编译错误

**解决方法**：
```bash
# 重新生成 Prisma Client
pnpm db:generate

# 清理并重新构建
rm -rf dist node_modules/.cache
pnpm build
```

## 安全提示

1. ⚠️ **永远不要在公共仓库中提交 API Keys**
2. ⚠️ **使用 HTTPS 传输 API Keys**
3. ⚠️ **定期轮换 API Keys**
4. ⚠️ **为不同环境使用不同的 `API_KEY_SECRET`**
5. ⚠️ **监控 API Key 使用情况**
6. ⚠️ **及时撤销不再使用的 Keys**
