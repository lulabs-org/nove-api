<h1 align="center">Nove API</h1>

<p align="center">
  基于 NestJS 的企业级多租户后端服务，提供完整的用户认证体系、组织权限管理、会议记录与统计分析，并深度集成腾讯会议 Webhook/开放 API、飞书多维表格（Bitable）同步与 OpenAI 智能能力。
</p>

<p align="center">
  <img alt="NestJS" src="https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript">
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-17-4169E1?logo=postgresql">
  <img alt="Redis" src="https://img.shields.io/badge/Redis-BullMQ-DC382D?logo=redis">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-green">
</p>

---

## 目录

- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [快速开始](#快速开始)
- [常用脚本](#常用脚本)
- [API 概览](#api-概览)
- [核心机制说明](#核心机制说明)
- [第三方集成说明](#第三方集成说明)
- [开发规范](#开发规范)
- [安全与部署](#安全与部署)
- [贡献指南](#贡献指南)

---

## 功能特性

### 认证与账户
- JWT 双 Token 机制（Access Token + Refresh Token）
- 基于 JTI 的 Token 黑名单撤销（支持登出后立即失效）
- 多种登录方式：邮箱/短信验证码、密码登录
- 用户资料管理、密码重置、登录日志与失败限流

### API Key 管理
- HMAC-SHA256 签名的 API Key 生成与验证
- 支持 Key 启用/禁用、权限范围配置
- API Key Guard 守卫，可按路由粒度控制

### 组织与权限
- **多租户组织（Org）**：支持多组织结构，成员关系独立管理
- **部门（Dept）**：组织内部部门树形结构
- **组织成员（OrgMember）**：用户与组织的绑定关系管理
- **RBAC 角色权限（Role / Permission）**：细粒度角色定义与权限分配
- **用户平台关联（UserPlatform）**：跨平台用户身份绑定

### 验证码与通知
- 邮箱验证码：基于 BullMQ 的异步邮件队列，支持 SMTP 连通性校验
- 短信验证码：阿里云短信服务，支持注册/登录/重置密码等场景模板化
- 验证码防刷与过期管理（60 秒/次，5 分钟有效期）

### 会议管理
- 会议记录 CRUD、统计分析、批量操作
- 会议数据重处理与同步机制
- 支持 RESTful API 与 GraphQL 查询

### 第三方集成
- **腾讯会议**：Webhook 事件接收（URL 校验/签名验证）、开放 API（录制/参会/转写/智能纪要）
- **飞书（Lark）**：多维表格 Bitable 双向同步（支持 upsert 去重）、Webhook 事件处理
- **OpenAI / 火山引擎方舟**：智能摘要、内容分析等 AI 能力集成
- **阿里云**：短信服务（Dysmsapi）

### 任务调度
- 基于 BullMQ 的异步任务队列（邮件发送、数据同步等）
- 定时任务调度（@nestjs/schedule）

### MCP Server
- 集成 Model Context Protocol（MCP），通过 SSE / HTTP 暴露工具接口，供 AI Agent 调用

---

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | NestJS 11 + TypeScript 5.7 |
| 数据库 | Prisma ORM 6 + PostgreSQL |
| 缓存/队列 | Redis + BullMQ + IORedis |
| 认证 | Passport + JWT + bcryptjs |
| API 协议 | RESTful + GraphQL (Apollo Server) |
| 文档 | Swagger/OpenAPI 3.0（`/api`）+ Redoc（`/docs`） |
| 测试 | Jest + Supertest（unit/integration/system/e2e，覆盖率 ≥80%） |
| MCP | @modelcontextprotocol/sdk + @rekog/mcp-nest |
| AI | OpenAI SDK / 火山引擎方舟 |
| 第三方 SDK | 腾讯会议 API · 飞书 @larksuiteoapi/node-sdk · 阿里云 @alicloud/dysmsapi20170525 · Nodemailer |

---

## 项目结构

```
nove_api/
├── src/
│   ├── api-key/                 # API Key 管理模块
│   │   ├── controllers/        # API Key CRUD 接口
│   │   ├── decorators/         # @ApiKeyAuth 等装饰器
│   │   ├── guards/             # ApiKeyGuard
│   │   ├── services/           # Key 生成 / 验证 / 吊销
│   │   └── repositories/       # API Key 数据访问层
│   ├── auth/                    # 认证模块（按用例拆分服务）
│   │   ├── services/           # register / login / password / token / auth-policy
│   │   ├── strategies/         # JWT 策略、用户查询、Token 黑名单
│   │   ├── repositories/       # refresh-token / login-log
│   │   ├── guards/             # JwtAuthGuard
│   │   ├── decorators/         # @Public / @CurrentUser 等
│   │   ├── dto/                # 请求/响应 DTO
│   │   └── enums/              # auth-type / login-type / verification-type
│   ├── user/                    # 用户模块
│   │   ├── services/           # profile.service
│   │   └── repositories/       # user.repository
│   ├── user-platform/           # 跨平台用户身份绑定
│   ├── verification/            # 验证码模块
│   │   ├── verification.service.ts
│   │   └── repositories/       # verification.repository
│   ├── org/                     # 组织（多租户）模块
│   │   ├── controllers/
│   │   ├── services/
│   │   └── repositories/
│   ├── dept/                    # 部门模块
│   │   ├── controllers/
│   │   ├── services/
│   │   └── repositories/
│   ├── org-member/              # 组织成员关系模块
│   │   ├── controllers/
│   │   ├── services/
│   │   └── repositories/
│   ├── role/                    # 角色模块（RBAC）
│   │   ├── controllers/
│   │   ├── guards/             # RoleGuard
│   │   ├── decorators/         # @Roles()
│   │   ├── services/
│   │   └── repositories/
│   ├── permission/              # 权限模块（细粒度资源权限）
│   │   ├── controllers/
│   │   ├── services/
│   │   └── repositories/
│   ├── meeting/                 # 会议业务模块
│   │   ├── meeting.service.ts
│   │   ├── repositories/       # meeting.repository
│   │   ├── dto/                # 会议 CRUD DTO
│   │   └── utils/              # 数据转换工具
│   ├── tencent-mtg-hook/        # 腾讯会议 Webhook 模块
│   │   ├── controllers/        # URL 校验 / 事件接收
│   │   ├── services/           # 事件处理服务
│   │   ├── interceptors/       # 签名验证拦截器
│   │   └── dto/                # Webhook 事件 DTO
│   ├── lark-meeting/            # 飞书会议模块
│   │   ├── controllers/        # lark-webhook.controller
│   │   ├── service/            # Bitable 同步服务
│   │   ├── adapter/            # 数据适配器
│   │   └── queue/              # 异步任务队列
│   ├── mcp-server/              # MCP Server 模块
│   │   ├── controllers/        # SSE / HTTP 端点
│   │   ├── tools/              # 暴露给 AI Agent 的工具方法
│   │   └── repositories/
│   ├── webhook-plugins/         # Webhook 插件系统（可扩展）
│   │   └── core/interfaces/    # 插件接口定义
│   ├── integrations/            # 第三方平台集成适配器
│   │   ├── tencent-meeting/    # 腾讯会议 API 客户端
│   │   ├── lark/               # 飞书 SDK 封装（Bitable / Auth）
│   │   ├── aliyun/             # 阿里云短信服务
│   │   ├── email/              # 邮件服务（Nodemailer）
│   │   └── openai/             # OpenAI / 方舟 API 服务
│   ├── mail/                    # 邮件队列模块
│   │   ├── mail.service.ts
│   │   └── mail.processor.ts   # BullMQ 消费者
│   ├── task/                    # 任务调度模块
│   │   ├── tasks.service.ts
│   │   └── task.processor.ts
│   ├── redis/                   # Redis 模块
│   ├── prisma/                  # Prisma 服务
│   ├── configs/                 # 配置文件（jwt / redis / aliyun / lark / tencent / openai）
│   ├── common/                  # 公共工具 / 枚举 / 邮件模板
│   ├── app.module.ts            # 根模块
│   ├── app.resolver.ts          # GraphQL Resolver
│   └── main.ts                  # 应用入口
├── prisma/
│   ├── schema.prisma            # 数据模型定义
│   ├── migrations/              # 数据库迁移
│   └── seed.ts                  # 数据填充脚本
├── test/
│   ├── unit/                    # 单元测试（src/**/*.spec.ts）
│   ├── integration/             # 集成测试（*.int-spec.ts）
│   ├── system/                  # 系统测试（*.spec.ts）
│   └── e2e/                     # 端到端测试（*.e2e-spec.ts）
├── scripts/                     # 工具脚本（shell backup 等）
├── docs/                        # 参考文档
├── Dockerfile
├── docker-compose.yml
└── docker-compose.aliyun.yml
```

**路径别名**：`@/` → `src/`，`@libs/` → `libs/`

---

## 快速开始

### 环境要求

- Node.js 18+
- pnpm 8+
- PostgreSQL 14+
- Redis 6+

### 安装步骤

**1. 安装依赖**

```bash
pnpm install
```

**2. 配置环境变量**

```bash
cp .env.example .env
```

编辑 `.env`，填写以下关键配置：

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | PostgreSQL 连接字符串 |
| `REDIS_HOST / REDIS_PORT / REDIS_PASSWORD` | Redis 连接信息 |
| `JWT_SECRET / JWT_REFRESH_SECRET` | JWT 签名密钥（生产环境必须替换） |
| `API_KEY_SECRET` | API Key HMAC 签名密钥 |
| `SMTP_*` | SMTP 邮件服务配置 |
| `ALIBABA_CLOUD_ACCESS_KEY_*` | 阿里云短信服务凭证 |
| `TENCENT_MEETING_*` | 腾讯会议 API 配置 |
| `LARK_APP_ID / LARK_APP_SECRET` | 飞书开放平台配置 |
| `ARK_API_KEY / OPENAI_API_KEY` | AI 服务配置 |

**3. 初始化数据库**

```bash
# 生成 Prisma Client
pnpm db:generate

# 推送 schema（开发环境）
pnpm db:push

# 或使用迁移（生产/协作环境）
pnpm db:migrate

# 填充种子数据（可选）
pnpm db:seed
```

**4. 启动服务**

```bash
# 开发模式（热重载）
pnpm start:dev

# 生产模式
pnpm build && pnpm start:prod
```

启动后访问：

| 地址 | 说明 |
|------|------|
| `http://localhost:3000` | 应用主入口 |
| `http://localhost:3000/api` | Swagger UI |
| `http://localhost:3000/api-json` | OpenAPI JSON |
| `http://localhost:3000/docs` | Redoc 文档 |
| `http://localhost:3000/graphql` | GraphQL Playground |
| `http://localhost:3000/sse` | MCP SSE 端点 |
| `http://localhost:3000/mcp` | MCP HTTP 端点 |

---

## 常用脚本

```bash
# ── 开发与构建 ──────────────────────────────────────────
pnpm start:dev              # 开发模式（watch）
pnpm start:debug            # 调试模式
pnpm build                  # 构建生产版本
pnpm start:prod             # 运行生产版本

# ── 代码质量 ────────────────────────────────────────────
pnpm lint                   # ESLint 检查并自动修复
pnpm format                 # Prettier 格式化
pnpm compodoc               # 生成代码文档

# ── 测试（覆盖率阈值 ≥80%）──────────────────────────────
pnpm test                   # 运行所有单元测试
pnpm test:unit              # 仅单元测试
pnpm test:integration       # 仅集成测试
pnpm test:system            # 仅系统测试
pnpm test:e2e               # 仅端到端测试
pnpm test:all               # 运行所有测试套件
pnpm test:ci                # CI 模式（all + coverage）
pnpm test:cov               # 生成覆盖率报告
pnpm test:watch             # 监听模式

# ── 数据库管理 ──────────────────────────────────────────
pnpm db:generate            # 生成 Prisma Client
pnpm db:push                # 推送 schema 到数据库（开发）
pnpm db:migrate             # 创建并应用迁移（生产）
pnpm db:migrate:status      # 查看迁移状态
pnpm db:migrate:prod        # 部署迁移到生产（prisma migrate deploy）
pnpm db:studio              # 打开 Prisma Studio
pnpm db:seed                # 填充种子数据
pnpm db:seed:real           # 填充真实数据（--real 模式）
pnpm db:cleandata           # 清理数据（仅数据，保留结构）
pnpm db:drop                # 删除所有数据
pnpm db:drop:force          # 强制删除（跳过确认）
pnpm db:seed:reset          # 重置并重新填充
pnpm db:reset               # 重置数据库（⚠️ 危险，会丢失全部数据）
pnpm db:backup              # 备份数据库

# ── 工具脚本 ────────────────────────────────────────────
pnpm validate:tencent-api   # 验证腾讯会议 API 配置

# ── MCP 调试 ────────────────────────────────────────────
pnpm mcp:inspect:sse        # MCP Inspector（SSE 模式）
pnpm mcp:inspect:http       # MCP Inspector（HTTP 模式）
```

---

## API 概览

### 文档地址
- **Swagger UI**：`http://localhost:3000/api`
- **Redoc**：`http://localhost:3000/docs`
- **GraphQL Playground**：`http://localhost:3000/graphql`

### RESTful API 端点

> 🔒 = 需要 JWT Bearer Token 认证 · 🗝️ = 支持 API Key 认证

#### 认证模块 (`/auth`)
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/auth/register` | 用户注册（邮箱/手机号） |
| POST | `/auth/login` | 用户登录（密码/验证码） |
| POST | `/auth/refresh-token` | 刷新访问令牌 |
| POST | `/auth/logout` | 登出（撤销 Token） |
| POST | `/auth/reset-password` | 重置密码 |

#### 用户模块 (`/user`)
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/user/profile` | 获取当前用户资料 🔒 |
| PUT | `/user/profile` | 更新用户资料 🔒 |

#### 验证码模块 (`/verification`)
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/verification/send` | 发送验证码（邮箱/短信） |
| POST | `/verification/verify` | 验证验证码 |

#### API Key 模块 (`/api-key`)
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api-key` | 创建 API Key 🔒 |
| GET | `/api-key` | 查询 API Key 列表 🔒 |
| DELETE | `/api-key/:id` | 删除 API Key 🔒 |
| PATCH | `/api-key/:id/status` | 启用/禁用 API Key 🔒 |

#### 组织模块 (`/org`)
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/org` | 创建组织 🔒 |
| GET | `/org` | 查询组织列表 🔒 |
| GET | `/org/:id` | 获取组织详情 🔒 |
| PUT | `/org/:id` | 更新组织 🔒 |
| DELETE | `/org/:id` | 删除组织 🔒 |

#### 部门模块 (`/dept`)
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/dept` | 创建部门 🔒 |
| GET | `/dept` | 查询部门列表 🔒 |
| PUT | `/dept/:id` | 更新部门 🔒 |
| DELETE | `/dept/:id` | 删除部门 🔒 |

#### 组织成员 (`/org-member`)
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/org-member` | 添加组织成员 🔒 |
| GET | `/org-member` | 查询成员列表 🔒 |
| DELETE | `/org-member/:id` | 移除成员 🔒 |

#### 角色模块 (`/role`)
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/role` | 创建角色 🔒 |
| GET | `/role` | 查询角色列表 🔒 |
| PUT | `/role/:id` | 更新角色 🔒 |
| DELETE | `/role/:id` | 删除角色 🔒 |

#### 权限模块 (`/permission`)
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/permission` | 创建权限 🔒 |
| GET | `/permission` | 查询权限列表 🔒 |

#### 会议模块 (`/meeting`)
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/meeting` | 查询会议列表 🔒 |
| GET | `/meeting/stats` | 会议统计分析 🔒 |
| GET | `/meeting/:id` | 获取会议详情 🔒 |
| POST | `/meeting` | 创建会议记录 🔒 |
| PUT | `/meeting/:id` | 更新会议记录 🔒 |
| DELETE | `/meeting/:id` | 删除会议记录 🔒 |

#### 邮件模块 (`/mail`)
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/mail/send` | 发送邮件（异步队列）🔒 |
| GET | `/mail/test-connection` | 测试 SMTP 连接 🔒 |

#### Webhook 端点
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/webhooks/tencent` | 腾讯会议 URL 校验 |
| POST | `/webhooks/tencent` | 腾讯会议事件接收 |
| POST | `/webhooks/lark` | 飞书事件接收 |
| POST | `/webhooks/feishu` | 飞书事件接收（兼容别名） |

---

## 核心机制说明

### Token 黑名单（JTI 机制）

每个 JWT Token 包含唯一的 `jti` 标识，登出时加入黑名单直至自然过期。

- **存储方案**：Redis（生产推荐）或 内存（单实例开发）
- **刷新流程**：刷新前需校验 Refresh Token 未被撤销
- **过期清理**：条目在 Token 到期后自动删除，无需手工维护
- **多实例部署**：必须使用 Redis 共享黑名单状态

### API Key 认证

API Key 使用 HMAC-SHA256 对随机字节签名生成，数据库仅存储哈希摘要，原始 Key 仅在创建时返回一次。可在路由层配置同时支持 JWT 和 API Key 双重认证。

### RBAC 权限模型

```
User ──belongs to──> OrgMember ──has──> Role ──contains──> Permission
                                          │
                                          └──> Department
```

权限由 `Role`（角色）聚合 `Permission`（操作权限），角色通过 `OrgMember` 与用户绑定，并限定在特定组织和部门范围内。

### MCP Server

通过 `/sse`（SSE）或 `/mcp`（Streamable HTTP）暴露 MCP 工具端点，供 Claude / Cursor 等 AI Agent 通过标准 MCP 协议调用后端能力。

```bash
# 使用 MCP Inspector 调试
pnpm mcp:inspect:sse
pnpm mcp:inspect:http
```

---

## 第三方集成说明

### 腾讯会议
- **Webhook 事件**：支持 URL 校验、签名验证、事件解密
- **开放 API**：已封装录制管理、参会人员、转写服务、智能纪要等接口
- **IP 白名单**：若遇到错误码 `500125`，需在腾讯会议后台添加服务器出口 IP
- **验证工具**：`pnpm validate:tencent-api`

### 飞书（Lark）
- **Bitable 同步**：双向数据同步，自动去重（基于唯一键 upsert）
- **Webhook 事件**：兼容 `/webhooks/lark` 和 `/webhooks/feishu` 两个路径
- **认证方式**：App ID + App Secret → Tenant Access Token

### 阿里云短信
- **场景模板**：注册、登录、重置密码分场景配置
- **防刷机制**：60 秒发送间隔 + 5 分钟有效期
- **推荐方案**：生产环境使用 RAM 角色/STS 临时凭证替代 AccessKey

### OpenAI / 火山引擎方舟
- 支持 OpenAI 兼容 API（官方 API、Azure OpenAI、火山引擎方舟等）
- 通过 `OPENAI_BASE_URL` 切换服务端点，默认对接火山引擎方舟（DeepSeek）

---

## 开发规范

### 代码风格
- **格式化**：Prettier（2 空格缩进、单引号、尾随逗号）
- **Lint**：ESLint + @typescript-eslint 8.20
- **命名约定**：

| 类型 | 规范 | 示例 |
|------|------|------|
| 文件名 | kebab-case | `user-profile.service.ts` |
| 类/接口 | PascalCase | `UserProfileService` |
| 变量/函数 | camelCase | `getUserProfile` |
| 常量 | UPPER_SNAKE_CASE | `JWT_SECRET` |
| DTO | 添加 Dto 后缀 | `CreateUserDto` |
| Guard | 添加 Guard 后缀 | `JwtAuthGuard` |
| 装饰器 | 添加语义后缀 | `@Public()`, `@CurrentUser()` |

### 模块组织
- **按领域分组**：每个功能模块包含 controller/service/repository/dto/enums
- **服务拆分**：按用例拆分服务（如 auth 模块拆分为 register/login/password/token 等服务）
- **路径别名**：使用 `@/` 引用 `src/` 下的模块，避免相对路径地狱
- **共享适配器**：可复用的集成适配器放在 `src/integrations/`

### 测试规范
- **测试框架**：Jest + Supertest
- **测试分层**：

| 类型 | 路径规范 | 说明 |
|------|----------|------|
| Unit | `src/**/*.spec.ts` | 单元测试，覆盖率 ≥80% |
| Integration | `test/integration/**/*.int-spec.ts` | 集成测试 |
| System | `test/system/**/*.spec.ts` | 系统测试 |
| E2E | `test/e2e/**/*.e2e-spec.ts` | 端到端测试 |

- **覆盖率要求**：statements / branches / functions / lines 均 ≥80%
- **CI 检查**：PR 前必须运行 `pnpm test:ci`

### Git 提交规范

遵循 Conventional Commits：

```
feat(org): 新增组织成员批量导入接口
fix(auth): 修复刷新令牌过期判断逻辑
refactor(role): 重构角色权限分配服务
test(api-key): 补充 API Key 生成单元测试
chore(deps): 升级 Prisma 到 6.10.1
docs(readme): 更新 MCP Server 使用说明
```

### Pull Request 规范
- **标题**：遵循 Conventional Commits 格式
- **描述**：关联 Issue、说明变更内容、附上测试证据
- **检查清单**：
  - [ ] 通过 `pnpm lint` 检查
  - [ ] 通过相关测试套件
  - [ ] 更新 `.env.example`（如有新配置）
  - [ ] 运行数据库迁移（如有 schema 变更）
  - [ ] 更新 API 文档（如有接口变更）

---

## 安全与部署

### 安全最佳实践
- **环境变量**：切勿提交 `.env` 文件，所有敏感配置基于 `.env.example` 管理
- **密钥管理**：生产环境必须更换所有默认密钥（`JWT_*`、`API_KEY_SECRET`、第三方 Secret）
- **Token 安全**：
  - Access Token 短期有效（推荐 15 分钟）
  - Refresh Token 长期有效（推荐 7 天）
  - 登出后立即撤销 Token（黑名单机制）
- **IP 白名单**：腾讯会议 API 需配置服务器出口 IP
- **密码策略**：bcryptjs 加密，salt rounds ≥10
- **验证码防刷**：60 秒/次，5 分钟有效期
- **阿里云凭证**：生产环境使用 RAM 角色/STS 替代 AccessKey

### 部署建议
- **多实例部署**：使用 Redis 共享 Token 黑名单与会话状态
- **数据库连接池**：配置合理的 Prisma 连接池大小
- **CORS 配置**：生产环境不要使用 `*`，精确配置允许的前端域名
- **日志管理**：生产环境接入日志收集系统（如 ELK）
- **监控告警**：监控 API 响应时间、错误率、BullMQ 队列积压等指标
- **备份策略**：定期备份数据库（`pnpm db:backup`）

### Docker 部署

```bash
# 标准环境
docker-compose up -d

# 阿里云环境
docker-compose -f docker-compose.aliyun.yml up -d
```

### 数据库迁移（生产）

```bash
# 查看迁移状态
pnpm db:migrate:status

# 部署迁移（不需要交互）
pnpm db:migrate:prod
```

---

## 贡献指南

欢迎提交 Issue 和 Pull Request！

- **新功能开发**：请先创建 Issue 讨论需求与设计
- **Bug 修复**：请附上复现步骤与环境信息
- **代码规范**：遵循项目的 ESLint 与 Prettier 配置
- **测试覆盖**：新增代码必须包含单元测试（覆盖率 ≥80%）

---

## 许可

[MIT License](./LICENSE)
