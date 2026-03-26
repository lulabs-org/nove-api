# 多租户架构设计文档

## 概述

本文档详细说明了 Nove API 后端系统的多租户架构设计方案。系统采用渐进式多租户架构，支持从早期到大规模的平滑演进，为多个公司提供服务时实现数据隔离、独立配置和资源管理。

## 目录

- [架构概述](#架构概述)
- [多租户方案对比](#多租户方案对比)
- [渐进式演进策略](#渐进式演进策略)
- [阶段 1：字段级隔离](#阶段-1字段级隔离)
- [阶段 2：Schema 级隔离](#阶段-2schema-级隔离)
- [阶段 3：数据库级隔离](#阶段-3数据库级隔离)
- [实施指南](#实施指南)
- [最佳实践](#最佳实践)
- [监控与运维](#监控与运维)
- [安全考虑](#安全考虑)

---

## 架构概述

### 业务场景

Nove API 后端系统需要为多个公司提供服务，每个公司（租户）需要：

- 独立的数据存储和访问
- 独立的用户管理和组织架构
- 独立的配置和权限体系
- 独立的资源配额和计费
- 完全的数据隔离和安全性

### 设计原则

1. **渐进式演进**：支持从简单到复杂的平滑升级
2. **最小改动**：保持现有架构，降低迁移成本
3. **性能优先**：根据业务规模选择合适的隔离级别
4. **安全第一**：确保租户间数据完全隔离
5. **可扩展性**：支持未来功能扩展和架构升级

### 核心概念

#### Organization vs Tenant

| 概念 | 定义 | 用途 |
|------|------|------|
| **Organization** | 企业内部组织架构 | 管理部门、层级、用户归属关系 |
| **Tenant** | 多租户系统中的租户 | 实现数据隔离、独立配置、资源管理 |

**双层架构设计：**

```
Tenant (租户层)
├── Organization A (组织层)
│   ├── Department A1
│   └── Department A2
└── Organization B
    ├── Department B1
    └── Department B2
```

---

## 多租户方案对比

### 方案 1：字段级隔离（Field-Level Isolation）

**架构特点：**

- 所有表添加 `tenantId` 字段
- 单数据库实例
- 通过字段过滤实现隔离

**优点：**

- ✅ 实施简单，改动最小
- ✅ 单数据库，运维成本低
- ✅ 跨租户查询方便（管理员视角）
- ✅ 适合早期阶段（< 10 个租户）

**缺点：**

- ❌ 数据隔离不彻底（管理员可跨租户查询）
- ❌ 性能瓶颈（单表数据量大）
- ❌ 安全风险（SQL 注入可能泄露数据）
- ❌ 资源竞争（租户共享数据库资源）

**适用场景：**

- 早期阶段（< 10 个租户）
- 数据量较小（< 100 万条记录）
- 对隔离要求不严格
- 快速验证商业模式

---

### 方案 2：Schema 级隔离（Schema-Level Isolation）

**架构特点：**

- 每个租户独立的 PostgreSQL Schema
- 单数据库实例，多 Schema
- 通过 Schema 实现逻辑隔离

**优点：**

- ✅ 数据隔离更彻底（Schema 级别）
- ✅ 性能较好（查询优化独立）
- ✅ 支持租户级别的备份/恢复
- ✅ 适合中期阶段（10-100 个租户）

**缺点：**

- ❌ 运维复杂度增加
- ❌ 跨租户查询困难
- ❌ Schema 迁移需要批量处理
- ❌ 仍然共享数据库资源

**适用场景：**

- 中期阶段（10-100 个租户）
- 数据量中等（100 万 - 1000 万条记录）
- 对隔离要求较高
- 需要租户级别的数据管理

---

### 方案 3：数据库级隔离（Database-Level Isolation）

**架构特点：**

- 每个租户独立的 PostgreSQL 数据库
- 完全物理隔离
- 独立的数据库实例或独立数据库

**优点：**

- ✅ 最强的数据隔离
- ✅ 性能最优（独立数据库）
- ✅ 独立备份/恢复
- ✅ 适合大规模（1000+ 租户）
- ✅ 支持跨数据中心部署

**缺点：**

- ❌ 运维成本最高
- ❌ 资源消耗大
- ❌ 跨租户功能无法实现
- ❌ 需要复杂的数据库管理工具

**适用场景：**

- 大规模阶段（100+ 租户）
- 数据量大（> 1000 万条记录）
- 对隔离和性能要求极高
- 金融、医疗等高安全要求行业

---

### 方案对比总结

| 维度 | 字段级隔离 | Schema 级隔离 | 数据库级隔离 |
|------|-----------|--------------|--------------|
| **隔离级别** | 软隔离（字段） | 逻辑隔离（Schema） | 物理隔离（数据库） |
| **数据可见性** | 管理员可跨租户 | 租户隔离 | 完全隔离 |
| **配置独立性** | 共享配置 | 租户独立配置 | 完全独立配置 |
| **计费模式** | 统一计费 | 按租户计费 | 按租户独立计费 |
| **用户归属** | 用户可跨租户 | 用户属于一个租户 | 用户属于一个租户 |
| **适用租户数** | < 10 | 10-100 | 100+ |
| **数据量** | < 100 万 | 100 万-1000 万 | > 1000 万 |
| **运维成本** | 低 | 中 | 高 |
| **实施复杂度** | 低 | 中 | 高 |
| **性能** | 中 | 良好 | 最优 |

---

## 渐进式演进策略

### 演进路线图

```
阶段 1 (0-6 个月)
├── 客户数：< 10
├── 数据量：< 100 万
├── 方案：字段级隔离
└── 目标：快速验证商业模式

阶段 2 (6-18 个月)
├── 客户数：10-100
├── 数据量：100 万-1000 万
├── 方案：Schema 级隔离
└── 目标：提升隔离性和性能

阶段 3 (18+ 个月)
├── 客户数：100+
├── 数据量：> 1000 万
├── 方案：数据库级隔离
└── 目标：支持大规模部署
```

### 演进触发条件

#### 从阶段 1 升级到阶段 2

- 租户数量达到 10 个
- 单表数据量超过 100 万条
- 查询性能明显下降（> 500ms）
- 租户对数据隔离要求提高
- 需要租户级别的备份/恢复

#### 从阶段 2 升级到阶段 3

- 租户数量达到 100 个
- 单租户数据量超过 1000 万条
- 数据库资源竞争严重
- 需要跨数据中心部署
- 合规要求（如 GDPR、HIPAA）

### 演进原则

1. **向后兼容**：新架构必须兼容旧数据
2. **平滑迁移**：支持零停机迁移
3. **可回滚**：迁移失败可以快速回滚
4. **灰度发布**：支持部分租户先升级
5. **数据一致性**：确保迁移过程中数据一致

---

## 阶段 1：字段级隔离

### 数据库模型

#### Tenant 模型

```prisma
// prisma/models/tenant.prisma
model Tenant {
  id          String       @id @default(cuid())
  name        String       // 公司名称
  code        String       @unique  // 公司代码（用于登录）
  status      TenantStatus @default(ACTIVE)
  plan        TenantPlan   @default(FREE)
  maxUsers    Int          @default(10)
  maxApiKeys  Int          @default(5)
  maxStorage  BigInt       @default(0)  // 最大存储空间（字节）
  expiredAt   DateTime?    // 过期时间
  
  // 关联关系
  organizations Organization[]
  users       User[]
  apiKeys     ApiKey[]
  
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  
  @@index([code])
  @@index([status])
  @@index([plan])
  @@map("tenants")
}

enum TenantStatus {
  ACTIVE      // 活跃
  SUSPENDED   // 暂停
  EXPIRED     // 过期
  PENDING     // 待审核
}

enum TenantPlan {
  FREE        // 免费版
  PRO         // 专业版
  ENTERPRISE  // 企业版
}
```

#### 修改现有模型

```prisma
// prisma/models/organization.prisma
model Organization {
  id          String  @id @default(cuid())
  tenantId    String  // 新增：租户ID
  name        String
  code        String  @unique
  description String?
  logo        String?
  parentId    String?
  level       Int     @default(1)
  sortOrder   Int     @default(0)
  active      Boolean @default(true)
  
  // 关联关系
  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  parent      Organization? @relation("OrganizationHierarchy", fields: [parentId], references: [id], onDelete: Restrict)
  children    Organization[] @relation("OrganizationHierarchy")
  departments Department[]
  users       UserOrganization[]
  apiKeys     ApiKey[]
  apiKeyUsageLogs ApiKeyUsageLog[]
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([tenantId])  // 新增索引
  @@index([parentId])
  @@index([code])
  @@index([active])
  @@index([parentId, sortOrder])
  @@map("organizations")
}

// prisma/models/user.prisma
model User {
  id        String  @id @default(cuid())
  tenantId  String  // 新增：租户ID
  email     String  @unique
  // ... 其他字段
  
  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  
  @@index([tenantId])  // 新增索引
  @@index([email])
  @@map("users")
}
```

### 核心实现

#### 租户上下文

```typescript
// src/common/context/tenant.context.ts
import { AsyncLocalStorage } from 'async_hooks';

export class TenantContext {
  private static storage = new AsyncLocalStorage<string>();
  
  static setCurrent(tenantId: string): void {
    this.storage.enterWith(tenantId);
  }
  
  static getCurrent(): string | undefined {
    return this.storage.getStore();
  }
  
  static clear(): void {
    this.storage.disable();
  }
}
```

#### 租户装饰器

```typescript
// src/common/decorators/tenant.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Tenant } from '@prisma/client';

export const CurrentTenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): Tenant => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenant;
  },
);

export const TenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenant?.id;
  },
);
```

#### 租户守卫

```typescript
// src/common/guards/tenant.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenantCode = request.headers['x-tenant-code'];
    
    if (!tenantCode) {
      throw new ForbiddenException('Tenant code is required');
    }
    
    // 查询租户信息
    const tenant = await this.prisma.tenant.findUnique({
      where: { code: tenantCode },
    });
    
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    
    if (tenant.status !== 'ACTIVE') {
      throw new ForbiddenException('Tenant is not active');
    }
    
    // 检查过期时间
    if (tenant.expiredAt && tenant.expiredAt < new Date()) {
      throw new ForbiddenException('Tenant has expired');
    }
    
    // 设置租户到请求上下文
    request.tenant = tenant;
    
    // 设置租户 ID 到上下文
    TenantContext.setCurrent(tenant.id);
    
    return true;
  }
}
```

#### Prisma 租户中间件

```typescript
// src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TenantContext } from '@/common/context/tenant.context';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      log: ['query', 'error', 'warn'],
    });
    
    // 添加租户隔离中间件
    this.$use(async (params, next) => {
      // 从 AsyncLocalStorage 获取当前租户 ID
      const tenantId = TenantContext.getCurrent();
      
      if (tenantId) {
        // 跳过租户表本身的操作
        if (params.model === 'Tenant') {
          return next(params);
        }
        
        // 自动添加 tenantId 过滤
        if (params.action === 'findMany' || params.action === 'findFirst' || params.action === 'findUnique') {
          params.args.where = {
            ...params.args.where,
            tenantId,
          };
        }
        
        if (params.action === 'create') {
          params.args.data = {
            ...params.args.data,
            tenantId,
          };
        }
        
        if (params.action === 'update') {
          params.args.where = {
            ...params.args.where,
            tenantId,
          };
        }
        
        if (params.action === 'delete' || params.action === 'deleteMany') {
          params.args.where = {
            ...params.args.where,
            tenantId,
          };
        }
      }
      
      return next(params);
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

#### 租户控制器

```typescript
// src/tenant/controllers/tenant.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TenantService } from '../services/tenant.service';
import { CreateTenantDto } from '../dto/create-tenant.dto';
import { UpdateTenantDto } from '../dto/update-tenant.dto';
import { CurrentTenant } from '@/common/decorators/tenant.decorator';

@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createTenantDto: CreateTenantDto) {
    return this.tenantService.create(createTenantDto);
  }

  @Get()
  findAll() {
    return this.tenantService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tenantService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTenantDto: UpdateTenantDto) {
    return this.tenantService.update(id, updateTenantDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.tenantService.remove(id);
  }

  @Get(':id/stats')
  getStats(@Param('id') id: string) {
    return this.tenantService.getStats(id);
  }
}
```

#### 租户服务

```typescript
// src/tenant/services/tenant.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateTenantDto } from '../dto/create-tenant.dto';
import { UpdateTenantDto } from '../dto/update-tenant.dto';

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTenantDto: CreateTenantDto) {
    // 检查租户代码是否已存在
    const existing = await this.prisma.tenant.findUnique({
      where: { code: createTenantDto.code },
    });

    if (existing) {
      throw new ConflictException('Tenant code already exists');
    }

    return this.prisma.tenant.create({
      data: createTenantDto,
    });
  }

  async findAll() {
    return this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            organizations: true,
            apiKeys: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  async update(id: string, updateTenantDto: UpdateTenantDto) {
    return this.prisma.tenant.update({
      where: { id },
      data: updateTenantDto,
    });
  }

  async remove(id: string) {
    return this.prisma.tenant.delete({
      where: { id },
    });
  }

  async getStats(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const [userCount, organizationCount, apiKeyCount, meetingCount] = await Promise.all([
      this.prisma.user.count({ where: { tenantId: id } }),
      this.prisma.organization.count({ where: { tenantId: id } }),
      this.prisma.apiKey.count({ where: { tenantId: id } }),
      this.prisma.meeting.count({ where: { tenantId: id } }),
    ]);

    return {
      tenantId: id,
      userCount,
      organizationCount,
      apiKeyCount,
      meetingCount,
      storageUsed: 0, // TODO: 计算实际存储使用量
    };
  }
}
```

### API 使用示例

#### 创建租户

```bash
POST /api/v1/tenants
Content-Type: application/json

{
  "name": "示例公司",
  "code": "example_company",
  "plan": "PRO",
  "maxUsers": 50,
  "maxApiKeys": 20
}
```

#### 租户认证

```bash
GET /api/v1/meetings
X-Tenant-Code: example_company
Authorization: Bearer <jwt_token>
```

#### 获取租户统计

```bash
GET /api/v1/tenants/:id/stats
Authorization: Bearer <admin_token>
```

---

## 阶段 2：Schema 级隔离

### 架构设计

```
PostgreSQL Database
├── public (主 Schema)
│   ├── tenants (租户表)
│   └── ...
├── tenant_abc123 (租户 A 的 Schema)
│   ├── users
│   ├── organizations
│   ├── meetings
│   └── ...
├── tenant_def456 (租户 B 的 Schema)
│   ├── users
│   ├── organizations
│   ├── meetings
│   └── ...
└── ...
```

### 核心实现

#### 租户数据库服务

```typescript
// src/tenant/services/tenant-database.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class TenantDatabaseService {
  private connections = new Map<string, PrismaClient>();
  
  constructor(private readonly prisma: PrismaService) {}
  
  async createTenantSchema(tenantId: string) {
    // 创建租户专属 Schema
    await this.prisma.$executeRawUnsafe(`
      CREATE SCHEMA IF NOT EXISTS tenant_${tenantId};
    `);
    
    // 在租户 Schema 中创建表结构
    const schemaPrisma = new PrismaClient({
      datasources: {
        db: {
          url: `${process.env.DATABASE_URL}?schema=tenant_${tenantId}`,
        },
      },
    });
    
    // 推送 Schema 到租户数据库
    await schemaPrisma.$push();
    await schemaPrisma.$disconnect();
  }
  
  async getTenantPrisma(tenantId: string): Promise<PrismaClient> {
    if (this.connections.has(tenantId)) {
      return this.connections.get(tenantId);
    }
    
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: `${process.env.DATABASE_URL}?schema=tenant_${tenantId}`,
        },
      },
    });
    
    this.connections.set(tenantId, prisma);
    return prisma;
  }
  
  async dropTenantSchema(tenantId: string) {
    // 删除租户 Schema
    await this.prisma.$executeRawUnsafe(`
      DROP SCHEMA IF EXISTS tenant_${tenantId} CASCADE;
    `);
    
    // 清理连接
    const connection = this.connections.get(tenantId);
    if (connection) {
      await connection.$disconnect();
      this.connections.delete(tenantId);
    }
  }
  
  async backupTenantSchema(tenantId: string): Promise<string> {
    // 备份租户 Schema
    const backupPath = `/backups/tenant_${tenantId}_${Date.now()}.sql`;
    
    await this.prisma.$executeRawUnsafe(`
      pg_dump -n tenant_${tenantId} > ${backupPath}
    `);
    
    return backupPath;
  }
  
  async restoreTenantSchema(tenantId: string, backupPath: string) {
    // 恢复租户 Schema
    await this.prisma.$executeRawUnsafe(`
      psql < ${backupPath}
    `);
  }
}
```

#### 租户迁移服务

```typescript
// src/tenant/services/tenant-migration.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { TenantDatabaseService } from './tenant-database.service';

@Injectable()
export class TenantMigrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantDatabaseService: TenantDatabaseService,
  ) {}
  
  async migrateTenantToSchema(tenantId: string) {
    console.log(`开始迁移租户 ${tenantId} 到 Schema 级隔离...`);
    
    // 1. 创建租户 Schema
    await this.tenantDatabaseService.createTenantSchema(tenantId);
    
    // 2. 迁移数据
    await this.migrateData(tenantId);
    
    // 3. 验证数据
    await this.validateMigration(tenantId);
    
    console.log(`租户 ${tenantId} 迁移完成`);
  }
  
  private async migrateData(tenantId: string) {
    const tenantPrisma = await this.tenantDatabaseService.getTenantPrisma(tenantId);
    
    // 迁移用户数据
    const users = await this.prisma.user.findMany({
      where: { tenantId },
    });
    
    for (const user of users) {
      await tenantPrisma.user.create({
        data: {
          id: user.id,
          email: user.email,
          // ... 其他字段
        },
      });
    }
    
    // 迁移组织数据
    const organizations = await this.prisma.organization.findMany({
      where: { tenantId },
    });
    
    for (const org of organizations) {
      await tenantPrisma.organization.create({
        data: {
          id: org.id,
          name: org.name,
          // ... 其他字段
        },
      });
    }
    
    // ... 迁移其他数据
  }
  
  private async validateMigration(tenantId: string) {
    const mainDbCount = await this.prisma.user.count({
      where: { tenantId },
    });
    
    const tenantPrisma = await this.tenantDatabaseService.getTenantPrisma(tenantId);
    const tenantDbCount = await tenantPrisma.user.count();
    
    if (mainDbCount !== tenantDbCount) {
      throw new Error(`数据迁移验证失败：用户数量不一致 (${mainDbCount} vs ${tenantDbCount})`);
    }
  }
}
```

---

## 阶段 3：数据库级隔离

### 架构设计

```
PostgreSQL Server
├── lulab_main (主数据库)
│   ├── tenants (租户表)
│   └── ...
├── tenant_abc123 (租户 A 的数据库)
│   ├── users
│   ├── organizations
│   ├── meetings
│   └── ...
├── tenant_def456 (租户 B 的数据库)
│   ├── users
│   ├── organizations
│   ├── meetings
│   └── ...
└── ...
```

### 核心实现

#### 租户编排服务

```typescript
// src/tenant/services/tenant-orchestrator.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { TenantDatabaseService } from './tenant-database.service';
import { TenantMigrationService } from './tenant-migration.service';

@Injectable()
export class TenantOrchestratorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantDatabaseService: TenantDatabaseService,
    private readonly tenantMigrationService: TenantMigrationService,
  ) {}
  
  async migrateTenantToDatabase(tenantId: string) {
    console.log(`开始迁移租户 ${tenantId} 到数据库级隔离...`);
    
    // 1. 创建独立数据库
    await this.createTenantDatabase(tenantId);
    
    // 2. 迁移数据
    await this.migrateData(tenantId);
    
    // 3. 更新租户配置
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { isolationLevel: 'DATABASE' },
    });
    
    console.log(`租户 ${tenantId} 迁移完成`);
  }
  
  private async createTenantDatabase(tenantId: string) {
    // 连接到 PostgreSQL 系统数据库
    const adminPrisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.ADMIN_DATABASE_URL,
        },
      },
    });
    
    // 创建租户数据库
    await adminPrisma.$executeRawUnsafe(`
      CREATE DATABASE tenant_${tenantId}
      WITH OWNER = postgres
      ENCODING = 'UTF8'
      CONNECTION LIMIT = -1;
    `);
    
    await adminPrisma.$disconnect();
  }
  
  private async migrateData(tenantId: string) {
    // 从 Schema 迁移到独立数据库
    const schemaPrisma = await this.tenantDatabaseService.getTenantPrisma(tenantId);
    const dbPrisma = await this.tenantDatabaseService.getTenantDatabasePrisma(tenantId);
    
    // 迁移所有表的数据
    const tables = ['users', 'organizations', 'meetings', 'api_keys'];
    
    for (const table of tables) {
      const data = await schemaPrisma.$queryRawUnsafe(`SELECT * FROM ${table}`);
      
      for (const row of data) {
        await dbPrisma.$executeRawUnsafe(`
          INSERT INTO ${table} VALUES ($1, $2, ...)
        `, Object.values(row));
      }
    }
  }
}
```

#### 租户数据库管理

```typescript
// src/tenant/services/tenant-database-management.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class TenantDatabaseManagementService {
  async createDatabaseBackup(tenantId: string): Promise<string> {
    const backupPath = `/backups/tenant_${tenantId}_${Date.now()}.dump`;
    
    // 使用 pg_dump 创建备份
    await this.executeCommand(
      `pg_dump -h ${process.env.DB_HOST} -U ${process.env.DB_USER} -d tenant_${tenantId} -F c -f ${backupPath}`
    );
    
    return backupPath;
  }
  
  async restoreDatabaseBackup(tenantId: string, backupPath: string): Promise<void> {
    // 使用 pg_restore 恢复备份
    await this.executeCommand(
      `pg_restore -h ${process.env.DB_HOST} -U ${process.env.DB_USER} -d tenant_${tenantId} -c ${backupPath}`
    );
  }
  
  async scaleDatabaseResources(tenantId: string, cpu: number, memory: number): Promise<void> {
    // 调整数据库资源配额
    await this.executeCommand(`
      ALTER DATABASE tenant_${tenantId} 
      SET statement_timeout = '${cpu}s';
    `);
  }
  
  private async executeCommand(command: string): Promise<void> {
    // 执行系统命令
    // 实现细节省略
  }
}
```

---

## 实施指南

### 阶段 1 实施步骤

#### 第 1 步：创建 Tenant 模型

```bash
# 1. 创建 Tenant 模型文件
touch prisma/models/tenant.prisma

# 2. 生成 Prisma Client
pnpm db:generate

# 3. 创建数据库迁移
pnpm db:migrate dev --name add_tenant_model
```

#### 第 2 步：为现有表添加 tenantId

```bash
# 1. 修改所有相关模型文件
# - prisma/models/organization.prisma
# - prisma/models/user.prisma
# - prisma/models/api-key.prisma
# - prisma/models/meeting.prisma
# - ... 其他表

# 2. 生成迁移
pnpm db:migrate dev --name add_tenant_id_to_all_tables
```

#### 第 3 步：实现租户上下文

```bash
# 1. 创建租户上下文类
mkdir -p src/common/context
touch src/common/context/tenant.context.ts

# 2. 创建租户装饰器
mkdir -p src/common/decorators
touch src/common/decorators/tenant.decorator.ts

# 3. 创建租户守卫
mkdir -p src/common/guards
touch src/common/guards/tenant.guard.ts
```

#### 第 4 步：更新 Prisma 服务

```bash
# 1. 修改 PrismaService 添加租户中间件
# src/prisma/prisma.service.ts

# 2. 重新生成 Prisma Client
pnpm db:generate
```

#### 第 5 步：创建租户模块

```bash
# 1. 创建租户模块
mkdir -p src/tenant/{controllers,services,dto,repositories}

# 2. 创建租户控制器
touch src/tenant/controllers/tenant.controller.ts

# 3. 创建租户服务
touch src/tenant/services/tenant.service.ts

# 4. 创建 DTO
touch src/tenant/dto/create-tenant.dto.ts
touch src/tenant/dto/update-tenant.dto.ts
```

#### 第 6 步：更新现有 API

```bash
# 1. 在需要租户隔离的控制器上添加 @UseGuards(TenantGuard)
# 2. 更新所有查询使用租户上下文
# 3. 添加租户认证中间件
```

#### 第 7 步：数据迁移

```bash
# 1. 创建数据迁移脚本
touch prisma/migrations/seed_tenant_data.ts

# 2. 为现有数据分配租户 ID
pnpm db:seed
```

#### 第 8 步：测试

```bash
# 1. 运行单元测试
pnpm test:unit

# 2. 运行集成测试
pnpm test:integration

# 3. 运行端到端测试
pnpm test:e2e
```

### 阶段 2 实施步骤

#### 第 1 步：创建租户数据库服务

```bash
# 1. 创建租户数据库服务
touch src/tenant/services/tenant-database.service.ts

# 2. 创建租户迁移服务
touch src/tenant/services/tenant-migration.service.ts
```

#### 第 2 步：实现 Schema 级隔离

```bash
# 1. 修改 Prisma 配置支持多 Schema
# prisma/schema.prisma

# 2. 创建 Schema 管理工具
touch src/tenant/utils/schema-manager.ts
```

#### 第 3 步：数据迁移

```bash
# 1. 创建迁移脚本
touch scripts/migrate-tenant-to-schema.ts

# 2. 执行迁移
pnpm ts-node scripts/migrate-tenant-to-schema.ts
```

### 阶段 3 实施步骤

#### 第 1 步：创建租户编排服务

```bash
# 1. 创建租户编排服务
touch src/tenant/services/tenant-orchestrator.service.ts

# 2. 创建租户数据库管理服务
touch src/tenant/services/tenant-database-management.service.ts
```

#### 第 2 步：实现数据库级隔离

```bash
# 1. 配置数据库连接池
# 2. 实现数据库管理工具
# 3. 创建备份/恢复工具
```

---

## 最佳实践

### 1. 租户识别

#### 方式 1：通过 Header（推荐）

```typescript
// 请求头
GET /api/v1/meetings
Headers:
  X-Tenant-Code: company_a
  Authorization: Bearer <jwt_token>
```

#### 方式 2：通过子域名

```typescript
// 子域名
GET https://company-a.yourdomain.com/api/v1/meetings
```

```typescript
// 中间件提取租户代码
@Injectable()
export class SubdomainMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    const host = req.headers.host;
    const subdomain = host.split('.')[0];
    req.tenantCode = subdomain;
    next();
  }
}
```

#### 方式 3：通过 JWT Token

```typescript
// JWT Payload
{
  "sub": "user_id",
  "tenant_id": "tenant_id",
  "exp": 1234567890
}

// JWT 策略
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { tenant: true },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }
}
```

### 2. 数据库查询

#### ❌ 错误：忘记添加 tenantId

```typescript
async getMeetings() {
  return this.prisma.meeting.findMany();
  // 危险：可能查询到其他租户的数据
}
```

#### ✅ 正确：自动添加 tenantId（通过 Prisma 中间件）

```typescript
async getMeetings() {
  return this.prisma.meeting.findMany();
  // 中间件自动添加: where: { tenantId: currentTenantId }
}
```

#### ✅ 正确：手动添加 tenantId

```typescript
async getMeetings(tenantId: string) {
  return this.prisma.meeting.findMany({
    where: { tenantId },
  });
}
```

### 3. 错误处理

#### 租户不存在

```typescript
throw new NotFoundException('Tenant not found');
```

#### 租户已过期

```typescript
throw new ForbiddenException('Tenant subscription has expired');
```

#### 租户配额超限

```typescript
throw new ConflictException('User limit exceeded for this tenant');
```

#### 租户已暂停

```typescript
throw new ForbiddenException('Tenant account is suspended. Please contact support.');
```

### 4. 配额管理

```typescript
// src/tenant/services/quota.service.ts
@Injectable()
export class QuotaService {
  constructor(private readonly prisma: PrismaService) {}
  
  async checkUserQuota(tenantId: string): Promise<boolean> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    
    const userCount = await this.prisma.user.count({
      where: { tenantId },
    });
    
    return userCount < tenant.maxUsers;
  }
  
  async checkApiKeyQuota(tenantId: string): Promise<boolean> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    
    const apiKeyCount = await this.prisma.apiKey.count({
      where: { tenantId },
    });
    
    return apiKeyCount < tenant.maxApiKeys;
  }
  
  async checkStorageQuota(tenantId: string): Promise<boolean> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    
    const storageUsed = await this.calculateStorageUsed(tenantId);
    
    return storageUsed < tenant.maxStorage;
  }
  
  private async calculateStorageUsed(tenantId: string): Promise<bigint> {
    // 计算租户实际使用的存储空间
    // 实现细节省略
    return BigInt(0);
  }
}
```

### 5. 缓存策略

```typescript
// src/common/cache/tenant-cache.service.ts
import { Injectable } from '@nestjs/common';
import { RedisService } from '@/redis/redis.service';

@Injectable()
export class TenantCacheService {
  constructor(private readonly redis: RedisService) {}
  
  async getTenant(tenantId: string) {
    const cacheKey = `tenant:${tenantId}`;
    const cached = await this.redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    
    if (tenant) {
      await this.redis.setex(cacheKey, 3600, JSON.stringify(tenant));
    }
    
    return tenant;
  }
  
  async invalidateTenant(tenantId: string) {
    const cacheKey = `tenant:${tenantId}`;
    await this.redis.del(cacheKey);
  }
}
```

---

## 监控与运维

### 1. 租户级别监控

```typescript
// src/tenant/services/tenant-monitoring.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class TenantMonitoringService {
  constructor(private readonly prisma: PrismaService) {}
  
  async getTenantMetrics(tenantId: string) {
    const [userCount, meetingCount, apiKeyCount, storageUsed] = await Promise.all([
      this.prisma.user.count({ where: { tenantId } }),
      this.prisma.meeting.count({ where: { tenantId } }),
      this.prisma.apiKey.count({ where: { tenantId } }),
      this.getStorageUsed(tenantId),
    ]);
    
    return {
      tenantId,
      userCount,
      meetingCount,
      apiKeyCount,
      storageUsed,
      timestamp: new Date(),
    };
  }
  
  async getAllTenantsMetrics() {
    const tenants = await this.prisma.tenant.findMany({
      where: { status: 'ACTIVE' },
    });
    
    const metrics = await Promise.all(
      tenants.map(tenant => this.getTenantMetrics(tenant.id))
    );
    
    return metrics;
  }
  
  async getStorageUsed(tenantId: string): Promise<bigint> {
    // 计算租户存储使用量
    // 实现细节省略
    return BigInt(0);
  }
}
```

### 2. 性能监控

```typescript
// src/common/interceptors/performance.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PerformanceInterceptor.name);
  
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.tenant?.id;
    const now = Date.now();
    
    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - now;
        
        this.logger.log(
          `[${tenantId}] ${request.method} ${request.url} - ${duration}ms`
        );
        
        // 如果响应时间超过 1 秒，记录警告
        if (duration > 1000) {
          this.logger.warn(
            `[${tenantId}] Slow request detected: ${request.method} ${request.url} - ${duration}ms`
          );
        }
      }),
    );
  }
}
```

### 3. 审计日志

```typescript
// src/audit/services/audit-log.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}
  
  async log(action: string, entityType: string, entityId: string, userId: string, tenantId: string, metadata?: any) {
    await this.prisma.auditLog.create({
      data: {
        action,
        entityType,
        entityId,
        userId,
        tenantId,
        metadata,
        timestamp: new Date(),
      },
    });
  }
  
  async getTenantAuditLogs(tenantId: string, limit: number = 100) {
    return this.prisma.auditLog.findMany({
      where: { tenantId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }
}
```

---

## 安全考虑

### 1. 数据隔离

#### Prisma 中间件强制隔离

```typescript
// 确保所有查询都包含 tenantId
this.$use(async (params, next) => {
  const tenantId = TenantContext.getCurrent();
  
  if (!tenantId && params.model !== 'Tenant') {
    throw new Error('Tenant context is required');
  }
  
  // ... 其他逻辑
});
```

### 2. 权限控制

```typescript
// src/common/guards/tenant-admin.guard.ts
@Injectable()
export class TenantAdminGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const tenantId = request.tenant?.id;
    
    // 检查用户是否是租户管理员
    const isAdmin = await this.prisma.userRole.findFirst({
      where: {
        userId: user.id,
        tenantId,
        role: {
          code: 'TENANT_ADMIN',
        },
      },
    });
    
    return !!isAdmin;
  }
}
```

### 3. 数据加密

```typescript
// src/common/utils/encryption.util.ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

export class EncryptionUtil {
  private static algorithm = 'aes-256-gcm';
  private static key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  
  static encrypt(text: string): { encrypted: string; iv: string; authTag: string } {
    const iv = randomBytes(16);
    const cipher = createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  }
  
  static decrypt(encrypted: string, iv: string, authTag: string): string {
    const decipher = createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

### 4. 敏感数据保护

```typescript
// src/common/decorators/sensitive-data.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const SENSITIVE_DATA = 'sensitive_data';

export const SensitiveData = () => SetMetadata(SENSITIVE_DATA, true);
```

```typescript
// src/common/interceptors/sensitive-data.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { SENSITIVE_DATA } from '../decorators/sensitive-data.decorator';

@Injectable()
export class SensitiveDataInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}
  
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const isSensitive = this.reflector.getAllAndOverride<boolean>(
      SENSITIVE_DATA,
      [context.getHandler(), context.getClass()]
    );
    
    if (!isSensitive) {
      return next.handle();
    }
    
    return next.handle().pipe(
      map(data => this.maskSensitiveData(data)),
    );
  }
  
  private maskSensitiveData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }
    
    const masked = { ...data };
    
    // 屏蔽敏感字段
    if (masked.email) {
      masked.email = this.maskEmail(masked.email);
    }
    
    if (masked.phone) {
      masked.phone = this.maskPhone(masked.phone);
    }
    
    return masked;
  }
  
  private maskEmail(email: string): string {
    const [name, domain] = email.split('@');
    return `${name[0]}***@${domain}`;
  }
  
  private maskPhone(phone: string): string {
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  }
}
```

---

## 总结

### 关键要点

1. **渐进式演进**：从字段级隔离开始，根据业务增长逐步升级
2. **双层架构**：Tenant（租户层）+ Organization（组织层）
3. **自动隔离**：通过 Prisma 中间件实现自动租户隔离
4. **安全第一**：确保租户间数据完全隔离
5. **可观测性**：实现租户级别的监控和审计

### 下一步行动

1. **立即实施阶段 1**：字段级隔离
2. **监控关键指标**：租户数量、数据量、性能
3. **制定升级计划**：根据业务增长确定升级时机
4. **完善文档**：记录架构决策和实施经验

### 参考资源

- [Prisma Multi-tenancy](https://www.prisma.io/docs/guides/performance-and-optimization/multi-tenancy-architecture)
- [PostgreSQL Schema Isolation](https://www.postgresql.org/docs/current/ddl-schemas.html)
- [NestJS Multi-tenancy](https://docs.nestjs.com/techniques/performance#databases)
- [AWS Multi-tenancy Best Practices](https://aws.amazon.com/blogs/architecture/saas-multi-tenancy-approaches-for-isolation-and-resiliency/)

---

**文档版本：** 1.0  
**最后更新：** 2026-01-05  
**维护者：** Nove API Team
