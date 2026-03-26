# 安全架构文档

本文档详细描述了 Nove API 系统的安全架构，包括认证与授权、数据安全、应用安全、网络安全和合规性要求。

## 安全架构概览

```text
┌─────────────────────────────────────────────────────────────┐
│                        安全边界                               │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Web防火墙  │  │  DDoS防护   │  │   API网关            │  │
│  │   (WAF)     │  │  (CloudFlare)│  │  (认证/限流/审计)    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                        应用层安全                             │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  身份认证    │  │  权限控制    │  │   数据验证           │  │
│  │  (JWT/OAuth)│  │  (RBAC)     │  │  (输入验证/过滤)      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                        数据层安全                             │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  数据加密    │  │  访问控制    │  │   审计日志           │  │
│  │ (传输/静态)  │  │ (最小权限)   │  │  (操作追踪)          │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                       基础设施安全                            │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  网络隔离    │  │  主机安全    │  │   密钥管理           │  │
│  │ (VPC/子网)   │  │ (加固/监控)  │  │ (KMS/轮换)          │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 认证与授权

### 身份认证

#### JWT Token 认证

**JWT 结构设计**:
```typescript
interface JWTPayload {
  // 标准字段
  iss: string;        // 签发者
  sub: string;        // 用户ID
  aud: string;        // 接收方
  exp: number;        // 过期时间
  iat: number;        // 签发时间
  jti: string;        // JWT ID (用于撤销)
  
  // 自定义字段
  type: 'access' | 'refresh';  // Token类型
  scope: string[];             // 权限范围
  orgId?: string;              // 组织ID
  sessionId: string;           // 会话ID
}
```

**Token 管理策略**:
```typescript
@Injectable()
export class TokenService {
  // 访问令牌: 短期有效 (15分钟)
  generateAccessToken(user: User, permissions: string[]): string {
    const payload: JWTPayload = {
      iss: 'lulab-backend',
      sub: user.id,
      aud: 'lulab-api',
      exp: Math.floor(Date.now() / 1000) + 15 * 60, // 15分钟
      iat: Math.floor(Date.now() / 1000),
      jti: uuidv4(),
      type: 'access',
      scope: permissions,
      orgId: user.organizationId,
      sessionId: user.currentSessionId,
    };
    
    return this.jwtService.sign(payload);
  }
  
  // 刷新令牌: 长期有效 (7天)
  generateRefreshToken(user: User): string {
    const payload: JWTPayload = {
      iss: 'lulab-backend',
      sub: user.id,
      aud: 'lulab-api',
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7天
      iat: Math.floor(Date.now() / 1000),
      jti: uuidv4(),
      type: 'refresh',
      scope: ['refresh'],
      sessionId: user.currentSessionId,
    };
    
    return this.jwtService.sign(payload);
  }
  
  // 令牌验证
  async validateToken(token: string): Promise<JWTPayload> {
    try {
      const payload = this.jwtService.verify(token);
      
      // 检查令牌是否在黑名单中
      const isBlacklisted = await this.redis.get(`blacklist:${payload.jti}`);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token has been revoked');
      }
      
      return payload;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
  
  // 令牌撤销 (加入黑名单)
  async revokeToken(jti: string, exp: number): Promise<void> {
    const ttl = exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) {
      await this.redis.setex(`blacklist:${jti}`, ttl, '1');
    }
  }
}
```

#### 多因素认证 (MFA)

**TOTP 实现**:
```typescript
@Injectable()
export class MFAService {
  // 生成密钥
  generateSecret(user: User): { secret: string; qrCode: string } {
    const secret = authenticator.generateSecret();
    const issuer = 'Nove API';
    const label = `${issuer} (${user.email})`;
    const otpauthUrl = authenticator.keyuri(user.email, issuer, secret);
    
    return {
      secret,
      qrCode: qrcode.toDataURL(otpauthUrl),
    };
  }
  
  // 验证TOTP
  verifyToken(secret: string, token: string): boolean {
    return authenticator.verify({
      token,
      secret,
      window: 2, // 允许时间窗口
    });
  }
  
  // 启用MFA
  async enableMFA(userId: string, secret: string, verificationCode: string): Promise<void> {
    const isValid = this.verifyToken(secret, verificationCode);
    if (!isValid) {
      throw new BadRequestException('Invalid verification code');
    }
    
    await this.userService.update(userId, {
      mfaEnabled: true,
      mfaSecret: this.encrypt(secret), // 加密存储
    });
  }
}
```

### 权限控制

#### RBAC 权限模型

**权限模型设计**:
```typescript
// 权限定义
interface Permission {
  id: string;
  code: string;        // 权限代码, 如 'meeting:create'
  resource: string;    // 资源, 如 'meeting'
  action: string;      // 操作, 如 'create'
  description: string; // 权限描述
}

// 角色定义
interface Role {
  id: string;
  name: string;
  code: string;        // 角色代码, 如 'admin', 'user'
  permissions: Permission[];
}

// 用户角色关联
interface UserRole {
  userId: string;
  roleId: string;
  scope?: string;      // 权限范围, 如组织ID
}
```

**权限检查实现**:
```typescript
@Injectable()
export class PermissionService {
  // 检查用户权限
  async hasPermission(
    userId: string,
    resource: string,
    action: string,
    scope?: string,
  ): Promise<boolean> {
    // 获取用户角色
    const userRoles = await this.userRoleRepository.findByUserId(userId);
    
    // 获取角色权限
    const roleIds = userRoles.map(ur => ur.roleId);
    const permissions = await this.rolePermissionRepository.findByRoleIds(roleIds);
    
    // 检查权限
    return permissions.some(p => 
      p.resource === resource && 
      p.action === action &&
      (!scope || p.scope === scope)
    );
  }
  
  // 获取用户权限列表
  async getUserPermissions(userId: string): Promise<Permission[]> {
    const userRoles = await this.userRoleRepository.findByUserId(userId);
    const roleIds = userRoles.map(ur => ur.roleId);
    return this.permissionRepository.findByRoleIds(roleIds);
  }
}

// 权限守卫
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private permissionService: PermissionService,
    private reflector: Reflector,
  ) {}
  
  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<string[]>(
      'permissions',
      context.getHandler(),
    );
    
    if (!requiredPermissions) {
      return true; // 无需权限的路由
    }
    
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    // 检查每个所需权限
    return requiredPermissions.every(({ resource, action }) =>
      this.permissionService.hasPermission(
        user.id,
        resource,
        action,
        request.params.orgId, // 从请求参数获取权限范围
      ),
    );
  }
}

// 权限装饰器
export const RequirePermissions = (...permissions: { resource: string; action: string }[]) =>
  SetMetadata('permissions', permissions);

// 使用示例
@Controller('meetings')
export class MeetingController {
  @Post()
  @RequirePermissions({ resource: 'meeting', action: 'create' })
  async createMeeting(@Body() createMeetingDto: CreateMeetingDto) {
    // ...
  }
  
  @Get(':id')
  @RequirePermissions({ resource: 'meeting', action: 'read' })
  async getMeeting(@Param('id') id: string) {
    // ...
  }
}
```

## 数据安全

### 数据加密

#### 敏感数据加密

**加密服务实现**:
```typescript
@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly tagLength = 16;
  
  constructor(@Inject('ENCRYPTION_KEY') private key: string) {}
  
  // 加密
  encrypt(text: string): string {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipher(this.algorithm, this.key);
    cipher.setAAD(Buffer.from('additional-data'));
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // 组合 IV + 标签 + 加密数据
    return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
  }
  
  // 解密
  decrypt(encryptedData: string): string {
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipher(this.algorithm, this.key);
    decipher.setAAD(Buffer.from('additional-data'));
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

// 敏感数据实体
@Entity()
export class User {
  @PrimaryColumn()
  id: string;
  
  @Column()
  email: string;
  
  @Column()
  @Transform(({ value }) => value ? encryptionService.decrypt(value) : null)
  phone: string; // 加密存储
  
  @Column()
  @Transform(({ value }) => value ? encryptionService.decrypt(value) : null)
  idNumber: string; // 加密存储
  
  @Column()
  @Transform(({ value }) => value ? encryptionService.decrypt(value) : null)
  bankAccount: string; // 加密存储
}
```

#### 数据传输加密

**HTTPS 配置**:
```typescript
// main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    httpsOptions: {
      key: fs.readFileSync('./ssl/private.key'),
      cert: fs.readFileSync('./ssl/certificate.crt'),
      ca: fs.readFileSync('./ssl/ca_bundle.crt'),
    },
  });
  
  // 强制HTTPS
  app.use(helmet.hsts({
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  }));
  
  await app.listen(3000);
}
```

**API 通信加密**:
```typescript
@Injectable()
export class ApiEncryptionService {
  // 请求加密
  encryptRequest(data: any): string {
    return this.encrypt(JSON.stringify(data));
  }
  
  // 响应解密
  decryptResponse(encryptedData: string): any {
    const decrypted = this.decrypt(encryptedData);
    return JSON.parse(decrypted);
  }
}

// 加密拦截器
@Injectable()
export class EncryptionInterceptor implements NestInterceptor {
  constructor(private encryptionService: ApiEncryptionService) {}
  
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    
    // 解密请求数据
    if (request.body && request.body.encrypted) {
      request.body = this.encryptionService.decryptResponse(request.body.data);
    }
    
    return next.handle().pipe(
      map(data => {
        // 加密响应数据
        if (request.headers['x-encrypt-response'] === 'true') {
          return {
            encrypted: true,
            data: this.encryptionService.encryptRequest(data),
          };
        }
        return data;
      }),
    );
  }
}
```

### 数据访问控制

#### 数据库安全

**连接安全配置**:
```typescript
// database.config.ts
export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: true,
    ca: fs.readFileSync('./ssl/ca.crt'),
    cert: fs.readFileSync('./ssl/client-cert.crt'),
    key: fs.readFileSync('./ssl/client-key.key'),
  } : false,
  // 连接池配置
  extra: {
    connectionLimit: 20,
    acquireTimeoutMillis: 60000,
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 600000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200,
  },
};
```

**数据访问审计**:
```typescript
@Injectable()
export class AuditService {
  // 记录数据访问
  async logDataAccess(
    userId: string,
    resource: string,
    resourceId: string,
    action: string,
    metadata?: any,
  ): Promise<void> {
    await this.auditRepository.create({
      userId,
      resource,
      resourceId,
      action,
      metadata,
      ipAddress: this.getRequestIP(),
      userAgent: this.getRequestUserAgent(),
      timestamp: new Date(),
    });
  }
}

// 数据访问审计拦截器
@Injectable()
export class DataAccessInterceptor implements NestInterceptor {
  constructor(private auditService: AuditService) {}
  
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    return next.handle().pipe(
      tap(() => {
        // 记录数据访问
        this.auditService.logDataAccess(
          user.id,
          request.route.path,
          request.params.id,
          request.method,
          {
            query: request.query,
            body: this.sanitizeRequestBody(request.body),
          },
        );
      }),
    );
  }
  
  private sanitizeRequestBody(body: any): any {
    // 移除敏感字段
    const sanitized = { ...body };
    delete sanitized.password;
    delete sanitized.creditCard;
    return sanitized;
  }
}
```

## 应用安全

### 输入验证与过滤

#### DTO 验证

**输入验证示例**:
```typescript
// create-meeting.dto.ts
export class CreateMeetingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;
  
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;
  
  @IsDateString()
  @IsNotEmpty()
  scheduledStartAt: string;
  
  @IsDateString()
  @IsNotEmpty()
  scheduledEndAt: string;
  
  @IsEnum(MeetingType)
  @IsOptional()
  type?: MeetingType = MeetingType.SCHEDULED;
  
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
  
  @ValidateNested()
  @IsOptional()
  @Type(() => MeetingSettingsDto)
  settings?: MeetingSettingsDto;
}

// 自定义验证器
export function IsFutureDate(property?: string) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isFutureDate',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      validator: {
        validate(value: any) {
          return new Date(value) > new Date();
        },
        defaultMessage() {
          return 'Date must be in the future';
        },
      },
    });
  };
}
```

#### SQL 注入防护

**安全查询实现**:
```typescript
@Injectable()
export class MeetingRepository {
  // 安全查询 - 使用参数化查询
  async findByDateRange(startDate: Date, endDate: Date): Promise<Meeting[]> {
    return this.prisma.meeting.findMany({
      where: {
        AND: [
          { startAt: { gte: startDate } },
          { endAt: { lte: endDate } },
        ],
      },
    });
  }
  
  // 动态查询 - 安全构建
  async searchMeetings(criteria: SearchMeetingDto): Promise<Meeting[]> {
    const where: any = {};
    
    // 安全构建查询条件
    if (criteria.title) {
      where.title = {
        contains: criteria.title,
        mode: 'insensitive', // 不区分大小写
      };
    }
    
    if (criteria.startDate && criteria.endDate) {
      where.AND = [
        { startAt: { gte: criteria.startDate } },
        { endAt: { lte: criteria.endDate } },
      ];
    }
    
    if (criteria.tags && criteria.tags.length > 0) {
      where.tags = {
        hasSome: criteria.tags,
      };
    }
    
    return this.prisma.meeting.findMany({ where });
  }
}
```

### XSS 防护

#### 内容过滤

**XSS 防护实现**:
```typescript
import * as sanitizeHtml from 'sanitize-html';

@Injectable()
export class ContentSanitizationService {
  // 清理HTML内容
  sanitizeHtml(dirty: string): string {
    return sanitizeHtml(dirty, {
      allowedTags: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'blockquote', 'p', 'a', 'ul', 'ol',
        'nl', 'li', 'b', 'i', 'strong', 'em', 'strike', 'code', 'hr', 'br', 'div',
        'table', 'thead', 'caption', 'tbody', 'tr', 'th', 'td', 'pre',
      ],
      allowedAttributes: {
        a: ['href', 'name', 'target'],
        img: ['src', 'alt', 'width', 'height'],
      },
      allowedSchemes: ['http', 'https', 'ftp', 'mailto'],
      allowedSchemesAppliedToAttributes: ['href', 'src', 'cite'],
      allowProtocolRelative: true,
    });
  }
  
  // 清理文本内容
  sanitizeText(text: string): string {
    return text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // 移除脚本
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // 移除iframe
      .replace(/javascript:/gi, '') // 移除javascript协议
      .replace(/on\w+\s*=/gi, ''); // 移除事件处理器
  }
}

// 内容清理管道
@Injectable()
export class ContentSanitizationPipe implements PipeTransform {
  constructor(
    private contentSanitization: ContentSanitizationService,
  ) {}
  
  transform(value: any) {
    if (typeof value === 'object' && value !== null) {
      // 递归处理对象属性
      const sanitized = {};
      for (const key in value) {
        if (value.hasOwnProperty(key)) {
          sanitized[key] = this.transform(value[key]);
        }
      }
      return sanitized;
    } else if (typeof value === 'string') {
      // 处理字符串
      return this.contentSanitization.sanitizeText(value);
    }
    
    return value;
  }
}
```

### CSRF 防护

#### CSRF 令牌实现

**CSRF 防护实现**:
```typescript
@Injectable()
export class CsrfService {
  // 生成CSRF令牌
  generateToken(sessionId: string): string {
    const payload = {
      sessionId,
      timestamp: Date.now(),
    };
    
    return this.jwtService.sign(payload, {
      secret: process.env.CSRF_SECRET,
      expiresIn: '1h',
    });
  }
  
  // 验证CSRF令牌
  validateToken(token: string, sessionId: string): boolean {
    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.CSRF_SECRET,
      });
      
      // 检查会话ID是否匹配
      return payload.sessionId === sessionId;
    } catch {
      return false;
    }
  }
}

// CSRF 守卫
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private csrfService: CsrfService) {}
  
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    // 跳过GET请求
    if (request.method === 'GET') {
      return true;
    }
    
    const token = request.headers['x-csrf-token'] || request.body._csrf;
    const sessionId = request.session?.id;
    
    if (!token || !sessionId) {
      throw new ForbiddenException('CSRF token missing');
    }
    
    if (!this.csrfService.validateToken(token, sessionId)) {
      throw new ForbiddenException('Invalid CSRF token');
    }
    
    return true;
  }
}

// CSRF 中间件
export function csrfMiddleware(req: Request, res: Response, next: NextFunction) {
  // 为GET请求生成CSRF令牌
  if (req.method === 'GET') {
    const sessionId = req.session?.id;
    if (sessionId) {
      const token = csrfService.generateToken(sessionId);
      res.setHeader('X-CSRF-Token', token);
      res.locals.csrfToken = token;
    }
  }
  
  next();
}
```

## 网络安全

### API 安全

#### 速率限制

**速率限制实现**:
```typescript
@Injectable()
export class RateLimitService {
  constructor(@Inject('REDIS_CLIENT') private redis: Redis) {}
  
  // 检查速率限制
  async checkRateLimit(
    key: string,
    limit: number,
    windowMs: number,
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // 使用滑动窗口算法
    const pipeline = this.redis.pipeline();
    
    // 移除过期的请求记录
    pipeline.zremrangebyscore(key, 0, windowStart);
    
    // 添加当前请求
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    
    // 获取当前窗口内的请求数
    pipeline.zcard(key);
    
    // 设置键的过期时间
    pipeline.expire(key, Math.ceil(windowMs / 1000));
    
    const results = await pipeline.exec();
    const currentCount = results[2][1] as number;
    
    const allowed = currentCount <= limit;
    const remaining = Math.max(0, limit - currentCount);
    const resetTime = now + windowMs;
    
    return { allowed, remaining, resetTime };
  }
}

// 速率限制守卫
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private rateLimitService: RateLimitService,
    private reflector: Reflector,
  ) {}
  
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rateLimit = this.reflector.get<{
      windowMs: number;
      limit: number;
    }>('rateLimit', context.getHandler());
    
    if (!rateLimit) {
      return true;
    }
    
    const request = context.switchToHttp().getRequest();
    const key = this.generateKey(request);
    
    const { allowed, remaining, resetTime } = await this.rateLimitService.checkRateLimit(
      key,
      rateLimit.limit,
      rateLimit.windowMs,
    );
    
    // 设置响应头
    const response = context.switchToHttp().getResponse();
    response.setHeader('X-RateLimit-Limit', rateLimit.limit);
    response.setHeader('X-RateLimit-Remaining', remaining);
    response.setHeader('X-RateLimit-Reset', resetTime);
    
    if (!allowed) {
      throw new ThrottlerException('Too many requests');
    }
    
    return true;
  }
  
  private generateKey(request: Request): string {
    // 根据IP或用户ID生成键
    const identifier = request.user?.id || request.ip;
    return `rate-limit:${identifier}:${request.path}`;
  }
}

// 速率限制装饰器
export const RateLimit = (windowMs: number, limit: number) =>
  SetMetadata('rateLimit', { windowMs, limit });

// 使用示例
@Controller('auth')
export class AuthController {
  @Post('login')
  @RateLimit(15 * 60 * 1000, 5) // 15分钟内最多5次登录尝试
  async login(@Body() loginDto: LoginDto) {
    // ...
  }
}
```

#### IP 白名单

**IP 白名单实现**:
```typescript
@Injectable()
export class IpWhitelistService {
  private readonly whitelist: string[] = [];
  
  constructor() {
    // 从环境变量加载白名单
    const whitelistEnv = process.env.IP_WHITELIST || '';
    this.whitelist = whitelistEnv.split(',').map(ip => ip.trim());
  }
  
  // 检查IP是否在白名单中
  isWhitelisted(ip: string): boolean {
    if (this.whitelist.length === 0) {
      return true; // 如果白名单为空，则允许所有IP
    }
    
    return this.whitelist.some(whitelistedIp => {
      // 支持CIDR格式
      if (whitelistedIp.includes('/')) {
        return ip.cidrSubnet(whitelistedIp).contains(ip);
      }
      
      // 精确匹配
      return ip === whitelistedIp;
    });
  }
}

// IP白名单守卫
@Injectable()
export class IpWhitelistGuard implements CanActivate {
  constructor(private ipWhitelistService: IpWhitelistService) {}
  
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.connection.remoteAddress;
    
    if (!this.ipWhitelistService.isWhitelisted(ip)) {
      throw new ForbiddenException('IP address not whitelisted');
    }
    
    return true;
  }
}
```

## 安全监控与审计

### 安全事件监控

**安全事件监控实现**:
```typescript
@Injectable()
export class SecurityEventService {
  constructor(
    @Inject('SECURITY_EVENTS_REDIS') private redis: Redis,
    private notificationService: NotificationService,
  ) {}
  
  // 记录安全事件
  async logSecurityEvent(
    type: SecurityEventType,
    severity: SecurityEventSeverity,
    userId?: string,
    details?: any,
  ): Promise<void> {
    const event = {
      id: uuidv4(),
      type,
      severity,
      userId,
      details,
      timestamp: new Date(),
      ipAddress: this.getRequestIP(),
      userAgent: this.getRequestUserAgent(),
    };
    
    // 存储事件
    await this.redis.lpush(
      'security-events',
      JSON.stringify(event),
    );
    
    // 设置事件列表长度
    await this.redis.ltrim('security-events', 0, 9999);
    
    // 高危事件立即通知
    if (severity === SecurityEventSeverity.HIGH) {
      await this.notificationService.sendSecurityAlert(event);
    }
  }
  
  // 获取安全事件
  async getSecurityEvents(
    limit: number = 100,
    offset: number = 0,
  ): Promise<SecurityEvent[]> {
    const events = await this.redis.lrange(
      'security-events',
      offset,
      offset + limit - 1,
    );
    
    return events.map(event => JSON.parse(event));
  }
  
  // 检测异常行为
  async detectAnomalousActivity(userId: string): Promise<boolean> {
    // 获取最近24小时的事件
    const events = await this.getSecurityEvents(1000);
    const userEvents = events.filter(e => e.userId === userId);
    
    // 检测多次登录失败
    const failedLogins = userEvents.filter(e => 
      e.type === SecurityEventType.LOGIN_FAILED &&
      e.timestamp > new Date(Date.now() - 24 * 60 * 60 * 1000),
    );
    
    if (failedLogins.length >= 5) {
      await this.logSecurityEvent(
        SecurityEventType.SUSPICIOUS_ACTIVITY,
        SecurityEventSeverity.HIGH,
        userId,
        { reason: 'Multiple failed login attempts', count: failedLogins.length },
      );
      return true;
    }
    
    return false;
  }
}

// 安全事件拦截器
@Injectable()
export class SecurityEventInterceptor implements NestInterceptor {
  constructor(private securityEventService: SecurityEventService) {}
  
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    return next.handle().pipe(
      catchError(async (error) => {
        // 记录安全相关错误
        if (error instanceof UnauthorizedException) {
          await this.securityEventService.logSecurityEvent(
            SecurityEventType.UNAUTHORIZED_ACCESS,
            SecurityEventSeverity.MEDIUM,
            request.user?.id,
            { path: request.path, method: request.method },
          );
        } else if (error instanceof ForbiddenException) {
          await this.securityEventService.logSecurityEvent(
            SecurityEventType.FORBIDDEN_ACCESS,
            SecurityEventSeverity.MEDIUM,
            request.user?.id,
            { path: request.path, method: request.method },
          );
        }
        
        throw error;
      }),
    );
  }
}
```

### 安全审计

**审计日志实现**:
```typescript
@Injectable()
export class SecurityAuditService {
  // 记录管理员操作
  async logAdminAction(
    adminId: string,
    action: string,
    targetResource: string,
    targetId: string,
    changes?: any,
  ): Promise<void> {
    const auditLog = {
      id: uuidv4(),
      adminId,
      action,
      targetResource,
      targetId,
      changes,
      timestamp: new Date(),
      ipAddress: this.getRequestIP(),
      userAgent: this.getRequestUserAgent(),
    };
    
    await this.auditRepository.create(auditLog);
  }
  
  // 记录敏感数据访问
  async logSensitiveDataAccess(
    userId: string,
    resource: string,
    resourceId: string,
    fields: string[],
  ): Promise<void> {
    const auditLog = {
      id: uuidv4(),
      userId,
      event: 'SENSITIVE_DATA_ACCESS',
      resource,
      resourceId,
      fields,
      timestamp: new Date(),
      ipAddress: this.getRequestIP(),
      userAgent: this.getRequestUserAgent(),
    };
    
    await this.auditRepository.create(auditLog);
  }
  
  // 生成审计报告
  async generateAuditReport(
    startDate: Date,
    endDate: Date,
    userId?: string,
  ): Promise<AuditReport> {
    const where: any = {
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    };
    
    if (userId) {
      where.userId = userId;
    }
    
    const logs = await this.auditRepository.findMany({ where });
    
    // 按事件类型分组统计
    const eventCounts = logs.reduce((acc, log) => {
      acc[log.event] = (acc[log.event] || 0) + 1;
      return acc;
    }, {});
    
    return {
      period: { startDate, endDate },
      totalEvents: logs.length,
      eventCounts,
      logs,
    };
  }
}
```

## 合规性要求

### 数据保护合规

**GDPR 合规实现**:
```typescript
@Injectable()
export class GdprService {
  // 数据可携带性 - 导出用户数据
  async exportUserData(userId: string): Promise<UserDataExport> {
    const user = await this.userService.findById(userId);
    const userProfile = await this.userProfileService.findByUserId(userId);
    const meetings = await this.meetingService.findByUserId(userId);
    const auditLogs = await this.auditService.findByUserId(userId);
    
    return {
      personalData: {
        user,
        userProfile,
      },
      activityData: {
        meetings,
        auditLogs,
      },
      exportDate: new Date(),
      format: 'JSON',
    };
  }
  
  // 被遗忘权 - 删除用户数据
  async deleteUserData(userId: string): Promise<void> {
    // 匿名化用户数据而不是物理删除
    await this.userService.anonymize(userId);
    await this.userProfileService.anonymize(userId);
    
    // 删除用户生成的数据
    await this.meetingService.deleteByUserId(userId);
    
    // 记录删除操作
    await this.auditService.logDataDeletion(userId);
  }
  
  // 数据处理同意管理
  async updateConsent(
    userId: string,
    consentType: ConsentType,
    granted: boolean,
  ): Promise<void> {
    await this.consentRepository.upsert({
      userId,
      consentType,
      granted,
      timestamp: new Date(),
      ipAddress: this.getRequestIP(),
      userAgent: this.getRequestUserAgent(),
    });
  }
}
```

### 安全认证

**安全认证实现**:
```typescript
@Injectable()
export class SecurityComplianceService {
  // 定期安全检查
  async performSecurityCheck(): Promise<SecurityCheckResult> {
    const results = {
      passwordPolicy: await this.checkPasswordPolicy(),
      encryptionStatus: await this.checkEncryptionStatus(),
      accessControl: await this.checkAccessControl(),
      auditLogging: await this.checkAuditLogging(),
    };
    
    return {
      timestamp: new Date(),
      overallStatus: Object.values(results).every(r => r.compliant),
      checks: results,
    };
  }
  
  // 密码策略检查
  private async checkPasswordPolicy(): Promise<ComplianceCheck> {
    const weakPasswords = await this.userRepository.find({
      where: {
        password: {
          // 检查弱密码
          not: this.generateStrongPasswordRegex(),
        },
      },
    });
    
    return {
      compliant: weakPasswords.length === 0,
      details: {
        weakPasswordCount: weakPasswords.length,
      },
    };
  }
  
  // 加密状态检查
  private async checkEncryptionStatus(): Promise<ComplianceCheck> {
    // 检查敏感数据是否加密
    const unencryptedPhones = await this.userRepository.find({
      where: {
        phone: {
          not: null,
        },
      },
    });
    
    return {
      compliant: unencryptedPhones.every(u => this.isEncrypted(u.phone)),
      details: {
        totalRecords: unencryptedPhones.length,
        encryptedRecords: unencryptedPhones.filter(u => this.isEncrypted(u.phone)).length,
      },
    };
  }
}
```