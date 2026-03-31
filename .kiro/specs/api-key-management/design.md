# API Key Management Platform - Design Document

## Overview

The API Key Management Platform module provides secure, multi-tenant API key generation, authentication, and management capabilities for the Lulab backend. The system enables organizations to issue API keys to external systems, authenticate incoming requests, enforce scope-based authorization, and maintain comprehensive audit logs.

The design follows NestJS architectural patterns with clear separation between admin management interfaces and external API authentication. Security is paramount: API keys are hashed using HMAC-SHA256, plaintext keys are never stored, and multi-tenant isolation is enforced at every layer.

Key design principles:
- **Security First**: Hash-only storage, single plaintext exposure, cryptographic key generation
- **Multi-tenant Isolation**: All operations scoped to organizationId
- **Extensibility**: Designed for future quota management, rate limiting, and advanced scope hierarchies
- **Auditability**: Comprehensive usage logging for security analysis
- **Performance**: Indexed lookups via prefix, efficient hash comparison

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Admin Interface                          │
│  (Authenticated Users with RBAC)                            │
│                                                              │
│  POST   /admin/api-keys          Create Key                 │
│  GET    /admin/api-keys          List Keys                  │
│  PATCH  /admin/api-keys/:id      Update Key                 │
│  POST   /admin/api-keys/:id/revoke   Revoke Key            │
│  POST   /admin/api-keys/:id/rotate   Rotate Key            │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │  ApiKeyController   │
         │  (Admin)            │
         └──────────┬──────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │  ApiKeyService      │
         │  - createKey()      │
         │  - verifyKey()      │
         │  - revokeKey()      │
         │  - rotateKey()      │
         │  - updateKey()      │
         └──────────┬──────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │  ApiKeyRepository   │
         │  (Prisma)           │
         └──────────┬──────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │  PostgreSQL         │
         │  - ApiKey           │
         │  - ApiKeyUsageLog   │
         └─────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   External API Interface                     │
│  (API Key Authentication)                                    │
│                                                              │
│  GET /v1/me                      Demo endpoint              │
│  GET /v1/meetings                Protected resource         │
│  ... other protected endpoints                              │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │  ApiKeyGuard        │
         │  - canActivate()    │
         │  - extractKey()     │
         │  - validateKey()    │
         └──────────┬──────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │  ApiScopesGuard     │
         │  - checkScopes()    │
         └──────────┬──────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │  UsageLogService    │
         │  - logRequest()     │
         └──────────┬──────────┘
                    │
                    ▼
         ┌─────────────────────┐
         │  ApiKeyUsageLog     │
         │  (Database)         │
         └─────────────────────┘
```

### Authentication Flow

1. **Admin Operations**: User authenticates via existing JWT/session → RBAC checks `api_keys:manage` permission → ApiKeyService executes operation
2. **External API Access**: Request includes API key → ApiKeyGuard extracts key → Service validates hash/status/expiry → ApiScopesGuard checks scopes → Request proceeds with auth context

### Multi-tenant Isolation

All database queries include `organizationId` filters. The authentication context carries the organization ID from the validated API key, ensuring complete tenant separation.

## Components and Interfaces

### 1. ApiKeyModule

**Responsibilities**: Module registration, dependency injection, guard configuration

**Exports**:
- `ApiKeyService`
- `ApiKeyGuard`
- `ApiScopesGuard`
- `@ApiScopes()` decorator

**Imports**:
- `PrismaModule`
- `ConfigModule` (for API_KEY_SECRET)

### 2. ApiKeyService

**Core Methods**:

```typescript
interface ApiKeyService {
  // Admin operations
  createKey(
    organizationId: string,
    userId: string,
    dto: CreateApiKeyDto
  ): Promise<CreateApiKeyResponse>;
  
  listKeys(
    organizationId: string,
    pagination?: PaginationDto
  ): Promise<ApiKeyListResponse>;
  
  updateKey(
    organizationId: string,
    keyId: string,
    dto: UpdateApiKeyDto
  ): Promise<ApiKeyDto>;
  
  revokeKey(
    organizationId: string,
    keyId: string
  ): Promise<void>;
  
  rotateKey(
    organizationId: string,
    keyId: string
  ): Promise<RotateApiKeyResponse>;
  
  // Authentication
  verifyKey(rawKey: string): Promise<ApiKeyAuthContext>;
}
```

**Key Generation Algorithm**:

```typescript
function generateApiKey(env: string): {
  rawKey: string;
  prefix: string;
  secret: string;
  keyHash: string;
  last4: string;
} {
  // Generate prefix: 8-12 chars base64url
  const prefix = generateRandomBase64Url(10);
  
  // Generate secret: 32-48 chars base64url
  const secret = generateRandomBase64Url(40);
  
  // Format: sk_<env>_<prefix>.<secret>
  const rawKey = `sk_${env}_${prefix}.${secret}`;
  
  // Hash: HMAC-SHA256(rawKey, API_KEY_SECRET)
  const keyHash = createHmac('sha256', API_KEY_SECRET)
    .update(rawKey)
    .digest('hex');
  
  // Last 4 for display
  const last4 = secret.slice(-4);
  
  return { rawKey, prefix, secret, keyHash, last4 };
}
```

**Key Verification Algorithm**:

```typescript
async function verifyKey(rawKey: string): Promise<ApiKeyAuthContext> {
  // Parse format: sk_<env>_<prefix>.<secret>
  const match = rawKey.match(/^sk_\w+_([^.]+)\.(.+)$/);
  if (!match) throw new UnauthorizedException('Invalid key format');
  
  const [, prefix, secret] = match;
  
  // Lookup by prefix (indexed)
  const apiKey = await prisma.apiKey.findUnique({
    where: { prefix },
    include: { organization: true }
  });
  
  if (!apiKey) throw new UnauthorizedException('Invalid API key');
  
  // Compute hash
  const computedHash = createHmac('sha256', API_KEY_SECRET)
    .update(rawKey)
    .digest('hex');
  
  // Constant-time comparison
  if (!timingSafeEqual(Buffer.from(computedHash), Buffer.from(apiKey.keyHash))) {
    throw new UnauthorizedException('Invalid API key');
  }
  
  // Check status
  if (apiKey.status !== 'ACTIVE') {
    throw new UnauthorizedException('API key is not active');
  }
  
  // Check expiration
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    throw new UnauthorizedException('API key has expired');
  }
  
  // Update last used timestamp (async, non-blocking)
  prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() }
  }).catch(err => logger.error('Failed to update lastUsedAt', err));
  
  return {
    organizationId: apiKey.organizationId,
    apiKeyId: apiKey.id,
    scopes: apiKey.scopes
  };
}
```

### 3. ApiKeyGuard

**Responsibilities**: Extract and validate API keys from requests

**Implementation**:

```typescript
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private apiKeyService: ApiKeyService) {}
  
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Extract key from headers
    const rawKey = this.extractKey(request);
    if (!rawKey) {
      throw new UnauthorizedException('API key required');
    }
    
    try {
      // Verify key
      const authContext = await this.apiKeyService.verifyKey(rawKey);
      
      // Attach to request
      request.apiAuth = authContext;
      
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid API key');
    }
  }
  
  private extractKey(request: Request): string | null {
    // Try Authorization: Bearer <key>
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    // Try x-api-key header
    const apiKeyHeader = request.headers['x-api-key'];
    if (apiKeyHeader) {
      return apiKeyHeader as string;
    }
    
    return null;
  }
}
```

### 4. ApiScopesGuard

**Responsibilities**: Enforce scope-based authorization

**Implementation**:

```typescript
@Injectable()
export class ApiScopesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  
  canActivate(context: ExecutionContext): boolean {
    const requiredScopes = this.reflector.get<string[]>(
      'apiScopes',
      context.getHandler()
    );
    
    if (!requiredScopes || requiredScopes.length === 0) {
      return true; // No scopes required
    }
    
    const request = context.switchToHttp().getRequest();
    const authContext: ApiKeyAuthContext = request.apiAuth;
    
    if (!authContext) {
      throw new ForbiddenException('Authentication context missing');
    }
    
    const hasAllScopes = requiredScopes.every(scope =>
      authContext.scopes.includes(scope)
    );
    
    if (!hasAllScopes) {
      throw new ForbiddenException('Insufficient scopes');
    }
    
    return true;
  }
}
```

### 5. @ApiScopes() Decorator

```typescript
export const ApiScopes = (...scopes: string[]) =>
  SetMetadata('apiScopes', scopes);
```

### 6. UsageLogService

**Responsibilities**: Record API key usage for audit

**Methods**:

```typescript
interface UsageLogService {
  logRequest(
    apiKeyId: string,
    organizationId: string,
    request: Request,
    response: Response,
    latencyMs: number,
    error?: string
  ): Promise<void>;
}
```

**Implementation**: Can be synchronous initially, with hooks for async queue processing (BullMQ) for high-volume scenarios.

### 7. ApiKeyRepository

**Responsibilities**: Prisma-based data access layer

**Methods**:

```typescript
interface ApiKeyRepository {
  create(data: CreateApiKeyData): Promise<ApiKey>;
  findByPrefix(prefix: string): Promise<ApiKey | null>;
  findById(id: string, organizationId: string): Promise<ApiKey | null>;
  findMany(organizationId: string, pagination?: Pagination): Promise<ApiKey[]>;
  update(id: string, organizationId: string, data: UpdateApiKeyData): Promise<ApiKey>;
  delete(id: string, organizationId: string): Promise<void>;
}
```

## Data Models

### Prisma Schema

```prisma
// prisma/models/api_key.prisma

enum ApiKeyStatus {
  ACTIVE
  REVOKED
  EXPIRED
}

model ApiKey {
  id             String        @id @default(cuid())
  organizationId String
  organization   Organization  @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  name           String
  prefix         String        @unique
  keyHash        String
  last4          String
  
  status         ApiKeyStatus  @default(ACTIVE)
  scopes         String[]      @default([])
  
  expiresAt      DateTime?
  revokedAt      DateTime?
  lastUsedAt     DateTime?
  
  createdBy      String?
  createdByUser  User?         @relation(fields: [createdBy], references: [id], onDelete: SetNull)
  
  rotatedFromId  String?       @unique
  rotatedFrom    ApiKey?       @relation("KeyRotation", fields: [rotatedFromId], references: [id], onDelete: SetNull)
  rotatedTo      ApiKey?       @relation("KeyRotation")
  
  usageLogs      ApiKeyUsageLog[]
  
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
  
  @@index([organizationId, status])
  @@index([organizationId, createdAt])
  @@index([status, expiresAt])
  @@map("api_keys")
}

model ApiKeyUsageLog {
  id             String   @id @default(cuid())
  apiKeyId       String
  apiKey         ApiKey   @relation(fields: [apiKeyId], references: [id], onDelete: Cascade)
  
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  
  method         String
  path           String
  statusCode     Int
  latencyMs      Int
  
  ip             String?
  userAgent      String?
  error          String?
  
  createdAt      DateTime @default(now())
  
  @@index([apiKeyId, createdAt])
  @@index([organizationId, createdAt])
  @@index([createdAt])
  @@map("api_key_usage_logs")
}
```

### DTOs

```typescript
// CreateApiKeyDto
export class CreateApiKeyDto {
  @IsString()
  @IsNotEmpty()
  name: string;
  
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  scopes?: string[];
  
  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}

// UpdateApiKeyDto
export class UpdateApiKeyDto {
  @IsString()
  @IsOptional()
  name?: string;
  
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  scopes?: string[];
  
  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}

// ApiKeyDto (response)
export class ApiKeyDto {
  id: string;
  name: string;
  prefix: string;
  last4: string;
  status: ApiKeyStatus;
  scopes: string[];
  expiresAt: Date | null;
  createdAt: Date;
  lastUsedAt: Date | null;
}

// CreateApiKeyResponse
export class CreateApiKeyResponse extends ApiKeyDto {
  key: string; // Only returned once
}

// RotateApiKeyResponse
export class RotateApiKeyResponse extends ApiKeyDto {
  key: string; // New key, only returned once
  oldKeyId: string;
}

// ApiKeyAuthContext
export interface ApiKeyAuthContext {
  organizationId: string;
  apiKeyId: string;
  scopes: string[];
}
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Key generation produces valid format

*For any* key creation request with valid inputs (name, optional scopes, optional expiration), the generated API key should match the format `sk_<env>_<prefix>.<secret>` where prefix is 8-12 base64url characters and secret is 32-48 base64url characters.

**Validates: Requirements 1.1, 10.1, 10.2, 10.3**

### Property 2: Hash-only storage

*For any* created API key, the database record should contain only the HMAC-SHA256 hash of the complete key, never the plaintext key itself.

**Validates: Requirements 1.2, 10.4**

### Property 3: Plaintext key single exposure

*For any* key creation or rotation operation, the plaintext key should be returned exactly once in the response, and subsequent queries should never return the plaintext key.

**Validates: Requirements 1.3, 5.3**

### Property 4: Multi-tenant key association

*For any* API key creation, the stored key should be associated with the correct organizationId, and listing keys for an organization should return only keys belonging to that organization.

**Validates: Requirements 1.4, 2.1, 11.1**

### Property 5: Prefix uniqueness

*For any* two API keys in the system, their prefixes should be unique across all organizations.

**Validates: Requirements 1.5**

### Property 6: List response completeness

*For any* API key in the list response, the response should include id, name, prefix, last4, status, scopes, expiresAt, createdAt, and lastUsedAt fields.

**Validates: Requirements 2.2**

### Property 7: List response security

*For any* API key list response, the response should never include the keyHash or plaintext key fields.

**Validates: Requirements 2.3**

### Property 8: Update preserves credentials

*For any* API key update operation (name, scopes, or expiresAt), the key's prefix and keyHash should remain unchanged.

**Validates: Requirements 3.1**

### Property 9: Scope replacement

*For any* API key scope update, the new scopes should exactly match the provided scope array, completely replacing the old scopes.

**Validates: Requirements 3.2**

### Property 10: Future expiration validation

*For any* expiration date update, dates in the past should be rejected, and dates in the future should be accepted.

**Validates: Requirements 3.3**

### Property 11: Cross-tenant operation denial

*For any* API key operation (update, revoke, rotate), attempting to operate on a key from a different organization should be denied.

**Validates: Requirements 3.4, 4.3, 11.2**

### Property 12: Revocation state transition

*For any* API key revocation, the key's status should change to REVOKED and revokedAt timestamp should be set.

**Validates: Requirements 4.1**

### Property 13: Revoked key authentication failure

*For any* revoked API key, all subsequent authentication attempts should fail with unauthorized error.

**Validates: Requirements 4.2**

### Property 14: Revocation preserves audit trail

*For any* revoked API key, the key record should remain in the database for audit purposes.

**Validates: Requirements 4.4**

### Property 15: Rotation generates new credentials

*For any* API key rotation, the new key should have a different prefix, secret, and keyHash from the original key.

**Validates: Requirements 5.1**

### Property 16: Rotation revokes old key

*For any* API key rotation, the old key's status should automatically change to REVOKED.

**Validates: Requirements 5.2**

### Property 17: Rotation preserves metadata

*For any* API key rotation, the new key should have the same name and scopes as the original key.

**Validates: Requirements 5.5**

### Property 18: Rotation relationship tracking

*For any* API key rotation, the new key's rotatedFromId should reference the old key's id.

**Validates: Requirements 5.4**

### Property 19: Authorization header extraction

*For any* request with a valid API key in the `Authorization: Bearer <key>` header, the system should successfully extract and validate the key.

**Validates: Requirements 6.1**

### Property 20: Alternative header extraction

*For any* request with a valid API key in the `x-api-key` header, the system should successfully extract and validate the key.

**Validates: Requirements 6.2**

### Property 21: Validation uses hash comparison

*For any* API key validation, the system should extract the prefix, query by prefix, compute HMAC-SHA256 hash of the provided key, and compare it with the stored hash using constant-time comparison.

**Validates: Requirements 6.3**

### Property 22: Non-active key rejection

*For any* API key with status other than ACTIVE, authentication attempts should fail.

**Validates: Requirements 6.4**

### Property 23: Expired key rejection

*For any* API key where expiresAt is in the past, authentication attempts should fail.

**Validates: Requirements 6.5**

### Property 24: Authentication context attachment

*For any* successfully validated API key, the request should have an authentication context containing organizationId, apiKeyId, and scopes.

**Validates: Requirements 6.6**

### Property 25: Scope authorization

*For any* scope-protected endpoint, requests with API keys lacking the required scopes should be rejected with HTTP 403.

**Validates: Requirements 7.1, 7.3**

### Property 26: Multiple scope requirement

*For any* endpoint requiring multiple scopes, the API key must contain all required scopes for access to be granted.

**Validates: Requirements 7.4**

### Property 27: Usage log completeness

*For any* API request using an API key, the usage log should include method, path, statusCode, latencyMs, ip, userAgent, apiKeyId, organizationId, and createdAt.

**Validates: Requirements 8.1, 8.5**

### Property 28: Usage log associations

*For any* usage log entry, it should be correctly associated with the apiKeyId and organizationId.

**Validates: Requirements 8.2, 11.3**

### Property 29: Usage log security

*For any* usage log entry, it should never contain the plaintext API key.

**Validates: Requirements 8.3**

### Property 30: Failed authentication logging

*For any* failed authentication attempt, a usage log entry should be created with error details.

**Validates: Requirements 8.4**

### Property 31: Authentication requirement

*For any* admin API key management endpoint, unauthenticated requests should be rejected.

**Validates: Requirements 9.1**

### Property 32: Permission requirement

*For any* admin API key management endpoint, requests from users without the `api_keys:manage` permission should be rejected.

**Validates: Requirements 9.2**

### Property 33: Last4 storage

*For any* created API key, the last4 field should contain the last 4 characters of the secret portion.

**Validates: Requirements 10.5**

## Error Handling

### Error Categories

1. **Authentication Errors (401)**
   - Missing API key
   - Invalid key format
   - Key not found
   - Invalid hash
   - Key revoked
   - Key expired

2. **Authorization Errors (403)**
   - Insufficient scopes
   - Cross-tenant access attempt

3. **Validation Errors (400)**
   - Invalid input format
   - Past expiration date
   - Invalid scope format

4. **Not Found Errors (404)**
   - API key ID not found for organization

### Error Response Format

```typescript
{
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
}
```

### Security Considerations

- Never include plaintext keys or hashes in error messages
- Use generic "Invalid API key" message for all authentication failures to prevent enumeration
- Log detailed error information server-side for debugging
- Rate limit authentication attempts to prevent brute force

## Testing Strategy

### Unit Testing

**Framework**: Jest

**Coverage Areas**:
- Key generation algorithm (format, length, uniqueness)
- Hash computation and verification
- DTO validation
- Error handling
- Repository methods
- Service business logic

**Example Unit Tests**:
- `ApiKeyService.createKey()` returns correct format
- `ApiKeyService.verifyKey()` rejects invalid keys
- `ApiKeyGuard.extractKey()` handles both header formats
- `ApiScopesGuard.canActivate()` enforces scope requirements
- Repository methods filter by organizationId

### Property-Based Testing

**Framework**: fast-check (for TypeScript/Node.js)

**Configuration**: Minimum 100 iterations per property test

**Test Tagging Format**: Each property-based test must include a comment:
```typescript
// Feature: api-key-management, Property 1: Key generation produces valid format
```

**Property Test Coverage**:

Each correctness property listed above must be implemented as a single property-based test. Property tests should:
- Generate random valid inputs (names, scopes, dates, organization IDs)
- Execute the operation
- Verify the property holds

**Example Property Tests**:

```typescript
// Feature: api-key-management, Property 2: Hash-only storage
it('should store only hash, never plaintext', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.string({ minLength: 1 }),
      fc.array(fc.string()),
      async (name, scopes) => {
        const result = await service.createKey(orgId, userId, { name, scopes });
        const stored = await repository.findById(result.id, orgId);
        
        expect(stored.keyHash).toBeDefined();
        expect(stored).not.toHaveProperty('key');
        expect(stored.keyHash).not.toBe(result.key);
      }
    ),
    { numRuns: 100 }
  );
});

// Feature: api-key-management, Property 11: Cross-tenant operation denial
it('should deny cross-tenant operations', async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.string({ minLength: 1 }),
      fc.string({ minLength: 1 }),
      async (org1, org2) => {
        fc.pre(org1 !== org2); // Ensure different orgs
        
        const key = await service.createKey(org1, userId, { name: 'test' });
        
        await expect(
          service.updateKey(org2, key.id, { name: 'hacked' })
        ).rejects.toThrow();
      }
    ),
    { numRuns: 100 }
  );
});
```

### Integration Testing

**Scope**: Test full request/response cycles with real database

**Coverage**:
- Admin endpoints with authentication
- External API endpoints with API key auth
- Usage logging
- Multi-tenant isolation
- Key rotation workflows

### Test Data Generators

Create generators for property-based testing:

```typescript
// Generators for fast-check
const apiKeyNameGen = fc.string({ minLength: 1, maxLength: 100 });
const scopeGen = fc.string({ minLength: 1, maxLength: 50 });
const scopesGen = fc.array(scopeGen, { minLength: 0, maxLength: 10 });
const futureDateGen = fc.date({ min: new Date() });
const organizationIdGen = fc.uuid();
```

## Security Considerations

### Key Storage
- Never store plaintext keys
- Use HMAC-SHA256 with server secret (stored in environment variable `API_KEY_SECRET`)
- Use constant-time comparison for hash verification to prevent timing attacks

### Key Format
- Format: `sk_<env>_<prefix>.<secret>`
- Prefix: 10 characters base64url (for fast lookup)
- Secret: 40 characters base64url (high entropy)
- Environment prefix allows key identification (dev/staging/prod)

### Multi-tenant Isolation
- All queries must include organizationId filter
- Verify organization ownership before any operation
- Index on (organizationId, status) for performance

### Rate Limiting (Future Extension)
- Implement rate limiting per API key
- Track request counts in Redis
- Configurable limits per organization tier

### Audit Trail
- Log all key operations (create, update, revoke, rotate)
- Log all authentication attempts (success and failure)
- Never log plaintext keys
- Retain logs for compliance requirements

### Key Rotation Best Practices
- Support grace period for old keys (future enhancement)
- Notify organization of rotation events
- Track rotation chains for audit

## Future Extensions

### 1. Quota Management
- Add `quotaLimit` and `quotaUsed` fields to ApiKey
- Track API calls per key
- Reject requests when quota exceeded
- Reset quotas on schedule (daily/monthly)

### 2. Rate Limiting
- Implement per-key rate limits
- Use Redis for distributed rate limiting
- Configurable limits: requests per second/minute/hour
- Return `X-RateLimit-*` headers

### 3. Scope Hierarchies
- Support wildcard scopes (`meetings:*`)
- Implement scope inheritance
- Scope groups and aliases

### 4. IP Allowlisting
- Add `allowedIps` field to ApiKey
- Validate request IP against allowlist
- Support CIDR notation

### 5. Webhook Notifications
- Notify on key creation/revocation
- Alert on suspicious usage patterns
- Quota threshold warnings

### 6. Usage Analytics
- Aggregate usage statistics
- Dashboard for key usage visualization
- Anomaly detection

### 7. Key Expiration Automation
- Background job to mark expired keys
- Automatic notification before expiration
- Auto-rotation option

### 8. Scoped Key Creation
- Allow keys to create sub-keys with limited scopes
- Hierarchical key relationships
- Delegation patterns

## Performance Considerations

### Database Indexes
- `prefix` (unique): Fast key lookup during authentication
- `(organizationId, status)`: Fast filtering for active keys
- `(organizationId, createdAt)`: Efficient listing with pagination
- `(apiKeyId, createdAt)`: Usage log queries
- `(status, expiresAt)`: Expired key cleanup jobs

### Caching Strategy (Future)
- Cache validated keys in Redis (short TTL: 5-10 minutes)
- Invalidate cache on revocation/update
- Reduce database load for high-traffic keys

### Async Operations
- Update `lastUsedAt` asynchronously (fire-and-forget)
- Queue usage log writes for high volume
- Background job for expired key cleanup

### Query Optimization
- Use `select` to limit returned fields
- Paginate large result sets
- Consider read replicas for usage analytics
