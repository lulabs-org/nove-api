<h1 align="center">LuLab Backend</h1>

基于 NestJS 的企业级会议与用户服务后端。提供完整的用户认证体系（JWT + Token 黑名单）、多渠道验证码（邮箱/短信）、异步邮件队列、会议记录管理与统计分析，并深度集成腾讯会议 Webhook/开放 API、飞书多维表格（Bitable）同步与 OpenAI 智能能力。数据层采用 Prisma ORM + PostgreSQL，支持 GraphQL 与 RESTful 双协议。

运行环境：Node.js 18+、pnpm、PostgreSQL、Redis。

## 功能特性

### 认证与账户
- JWT 双 Token 机制（Access Token + Refresh Token）
- 基于 JTI 的 Token 黑名单撤销（支持登出后立即失效）
- 多种登录方式：邮箱/短信验证码、密码登录
- 用户资料管理、密码重置、登录日志与失败限流

### 验证码与通知
- 邮箱验证码：基于 BullMQ 的异步邮件队列，支持 SMTP 连通性校验
- 短信验证码：阿里云短信服务，支持注册/登录/重置密码等场景模板化
- 验证码防刷与过期管理

### 会议管理
- 会议记录 CRUD、统计分析、批量操作
- 会议数据重处理与同步机制
- 支持 RESTful API 与 GraphQL 查询

### 第三方集成
- **腾讯会议**：Webhook 事件接收（URL 校验/签名验证）、开放 API（录制/参会/转写/智能纪要）
- **飞书**：多维表格 Bitable 双向同步（支持 upsert 去重）、Webhook 事件处理
- **OpenAI**：智能摘要、内容分析等 AI 能力集成
- **阿里云**：短信服务（Dysmsapi）

### 任务调度
- 基于 BullMQ 的异步任务队列（邮件发送、数据同步等）
- 定时任务调度（@nestjs/schedule）

## 技术栈

- **框架**：NestJS 11 + TypeScript 5.7
- **数据库**：Prisma ORM 6/7（`prisma-client` generator + `@prisma/adapter-pg` driver adapter）+ PostgreSQL
- **缓存/队列**：Redis + BullMQ + IORedis
- **认证**：Passport + JWT + bcryptjs
- **API 协议**：RESTful + GraphQL (Apollo Server)
- **文档**：Swagger/OpenAPI 3.0（`/api`）
- **测试**：Jest + Supertest（unit/integration/system/e2e，覆盖率 ≥80%）
- **第三方 SDK**：
  - 腾讯会议 API
  - 飞书开放平台 SDK (@larksuiteoapi/node-sdk)
  - 阿里云短信 SDK (@alicloud/dysmsapi20170525)
  - OpenAI SDK
  - Nodemailer (邮件)

## 项目结构

```
src/
├── auth/                    # 认证模块（按用例拆分服务）
│   ├── services/           # register/login/password/token/auth-policy
│   ├── strategies/         # JWT 策略、用户查询、Token 黑名单
│   ├── repositories/       # refresh-token/login-log
│   ├── guards/             # JWT 守卫
│   ├── decorators/         # Public/CurrentUser 等装饰器
│   ├── dto/                # 请求/响应 DTO
│   └── enums/              # auth-type/login-type/verification-type
├── user/                    # 用户模块
│   ├── services/           # profile.service
│   └── repositories/       # user.repository
├── verification/            # 验证码模块
│   ├── verification.service.ts
│   ├── repositories/       # verification.repository
│   └── enums/              # verification-type/scene
├── meeting/                 # 会议业务模块
│   ├── meeting.service.ts
│   ├── repositories/       # meeting.repository
│   ├── dto/                # 会议 CRUD DTO
│   └── utils/              # 数据转换工具
├── hook-tencent-mtg/        # 腾讯会议 Webhook 模块
│   ├── controllers/        # webhook.controller（URL 校验/事件接收）
│   ├── services/           # 事件处理服务
│   ├── interceptors/       # 签名验证拦截器
│   └── dto/                # Webhook 事件 DTO
├── lark-meeting/            # 飞书会议模块
│   ├── controllers/        # lark-webhook.controller
│   ├── service/            # Bitable 同步服务
│   ├── adapter/            # 数据适配器
│   └── queue/              # 异步任务队列
├── integrations/            # 第三方平台集成
│   ├── tencent-meeting/    # 腾讯会议 API 客户端
│   ├── lark/               # 飞书 SDK 封装（Bitable/Auth）
│   ├── aliyun/             # 阿里云短信服务
│   ├── email/              # 邮件服务（Nodemailer）
│   └── openai/             # OpenAI 服务
├── mail/                    # 邮件队列模块
│   ├── mail.service.ts     # 邮件发送服务
│   └── mail.processor.ts   # BullMQ 消费者
├── task/                    # 任务调度模块
│   ├── tasks.service.ts    # 定时任务服务
│   └── task.processor.ts   # 任务队列处理器
├── redis/                   # Redis 模块
├── prisma/                  # Prisma 服务
├── configs/                 # 配置文件（jwt/redis/aliyun/lark/tencent/openai）
├── common/                  # 公共工具/枚举/邮件模板
├── app.module.ts            # 根模块
├── app.resolver.ts          # GraphQL Resolver
└── main.ts                  # 应用入口

prisma/
├── schema.prisma            # 数据模型定义
├── migrations/              # 数据库迁移
└── seed.ts                  # 数据填充脚本

test/
├── unit/                    # 单元测试（src/**/*.spec.ts）
├── integration/             # 集成测试（*.int-spec.ts）
├── system/                  # 系统测试（*.spec.ts）
└── e2e/                     # 端到端测试（*.e2e-spec.ts）
```

**路径别名**：`@/` → `src/`

## 快速开始

### 0) 环境依赖（关键）

运行本项目前，请确保以下服务已就绪，否则会报连接错误：

| 依赖 | 用途 | 是否必需 | 默认地址 |
|------|------|---------|---------|
| Node.js 18+ | 运行时 | 必需 | — |
| pnpm | 包管理 | 必需 | — |
| PostgreSQL 14+ | 主数据库（Prisma ORM） | 必需 | `localhost:5432` |
| Redis 6+ | 缓存 / BullMQ 队列 / Token 黑名单 | 必需 | `localhost:6379` |
| Docker（可选） | 一键启动 PostgreSQL + Redis | 推荐 | — |

> ⚠️ 若执行 `pnpm db:push` / `pnpm db:migrate` 报
> `P1001: Can't reach database server at localhost:5432`，
> 说明本机 **PostgreSQL 未启动**。请按下面任一方式先启动数据库：

**方式 A：Docker（推荐，同时启动 PostgreSQL 与 Redis）**

```bash
docker compose up -d postgres redis
```

**方式 B：本机原生安装 PostgreSQL**

- 下载并安装 [PostgreSQL](https://www.postgresql.org/download/windows/)，确认服务已启动；
- 创建数据库 `lulab`，并将 `.env` 的 `DATABASE_URL` 改为实际连接串。

1) 安装依赖

```bash
pnpm install
```

2) 配置环境变量

复制 `.env.example` 为 `.env`，并按环境补充：

> 注意：`.env` 中的 `DATABASE_URL` 请直接写明文连接串
> （如 `postgresql://user:pass@localhost:5432/lulab?schema=public`），
> 不要使用 `${VAR}` 插值——Prisma 不会展开它。

3) 初始化数据库

> `pnpm install` 会通过 `postinstall` 自动执行 `prisma generate`，
> 将 Prisma Client 生成到 `src/generated/prisma`（该目录已 gitignore）。
> 手动重新生成可运行 `pnpm db:generate`。

```bash
pnpm db:push      # 或 pnpm db:migrate
pnpm db:seed      # 可选
```

4) 启动服务

```bash
pnpm start:dev    # 开发
pnpm build && pnpm start:prod
```

启动后：

- 应用：`http://localhost:3000`
- Swagger：`http://localhost:3000/api`

## 常用脚本

```bash
# 开发与构建
pnpm start:dev              # 开发模式（watch）
pnpm start:debug            # 调试模式
pnpm build                  # 构建生产版本
pnpm start:prod             # 运行生产版本

# 代码质量
pnpm lint                   # ESLint 检查并自动修复
pnpm format                 # Prettier 格式化
pnpm compodoc               # 生成代码文档

# 测试（覆盖率阈值 ≥80%）
pnpm test                   # 运行所有单元测试
pnpm test:unit              # 仅单元测试
pnpm test:integration       # 仅集成测试
pnpm test:system            # 仅系统测试
pnpm test:e2e               # 仅端到端测试
pnpm test:all               # 运行所有测试套件
pnpm test:ci                # CI 模式（all + coverage）
pnpm test:cov               # 生成覆盖率报告
pnpm test:watch             # 监听模式

# 数据库管理
pnpm db:generate            # 生成 Prisma Client
pnpm db:push                # 推送 schema 到数据库（开发）
pnpm db:migrate             # 创建并应用迁移（生产）
pnpm db:studio              # 打开 Prisma Studio
pnpm db:seed                # 填充种子数据
pnpm db:reset               # 重置数据库（危险）
pnpm db:drop                # 删除所有数据
pnpm db:drop:force          # 强制删除（跳过确认）
pnpm db:seed:reset          # 重置并重新填充
pnpm db:cleandata           # 清理数据
pnpm db:backup              # 备份数据库

# 工具脚本
pnpm validate:tencent-api   # 验证腾讯会议 API 配置
```

## API 概览

### 文档地址
- **Swagger UI**：`http://localhost:3000/api`
- **GraphQL Playground**：`http://localhost:3000/graphql`

### RESTful API 端点

#### 认证模块 (`/api/auth`)
- `POST /auth/register` - 用户注册（邮箱/手机号）
- `POST /auth/login` - 用户登录（密码/验证码）
- `POST /auth/refresh-token` - 刷新访问令牌
- `POST /auth/logout` - 登出（撤销 Token）
- `POST /auth/reset-password` - 重置密码

#### 用户模块 (`/api/user`)
- `GET /user/profile` - 获取当前用户资料 🔒
- `PUT /user/profile` - 更新用户资料 🔒

#### 验证码模块 (`/api/verification`)
- `POST /verification/send` - 发送验证码（邮箱/短信）
- `POST /verification/verify` - 验证验证码

#### 会议模块 (`/api/meeting`)
- `GET /meeting` - 查询会议列表 🔒
- `GET /meeting/:id` - 获取会议详情 🔒
- `POST /meeting` - 创建会议记录 🔒
- `PUT /meeting/:id` - 更新会议记录 🔒
- `DELETE /meeting/:id` - 删除会议记录 🔒
- `GET /meeting/stats` - 会议统计分析 🔒

#### 邮件模块 (`/api/mail`)
- `POST /mail/send` - 发送邮件（异步队列）🔒
- `GET /mail/test-connection` - 测试 SMTP 连接 🔒

#### Webhook 端点
- `GET /webhooks/tencent` - 腾讯会议 URL 校验
- `POST /webhooks/tencent` - 腾讯会议事件接收
- `POST /webhooks/lark` - 飞书事件接收
- `POST /webhooks/feishu` - 飞书事件接收（兼容别名）

🔒 = 需要 JWT Bearer Token 认证

### Token 撤销机制（黑名单）

本项目实现了基于 JTI（JWT ID）的 Token 黑名单机制：

- **工作原理**：每个 Access Token 和 Refresh Token 都包含唯一的 `jti` 标识
- **登出流程**：调用 `POST /auth/logout` 时，当前 Token 的 `jti` 会被加入黑名单，直至 Token 自然过期
- **验证流程**：所有受保护的接口都会检查 Token 的 `jti` 是否在黑名单中
- **刷新流程**：刷新 Token 前会验证 Refresh Token 是否已被撤销
- **存储方案**：
  - 默认：基于 Redis 的分布式黑名单（推荐生产环境）
  - 可选：内存黑名单（仅适用于单实例开发环境）
- **过期清理**：黑名单条目会在 Token 过期后自动清理，避免内存泄漏

**多实例部署注意**：生产环境必须使用 Redis 等共享存储来同步黑名单状态。

## 第三方集成说明

### 腾讯会议
- **Webhook 事件**：支持 URL 校验、签名验证、事件解密
- **开放 API**：已封装录制管理、参会人员、转写服务、智能纪要等接口
- **IP 白名单**：腾讯 API 存在调用方 IP 限制，若遇到错误码 `500125`，需在腾讯会议后台添加服务器出口 IP
- **验证工具**：运行 `pnpm validate:tencent-api` 测试 API 配置

### 飞书（Lark）
- **Bitable 同步**：支持双向数据同步，自动去重（基于唯一键 upsert）
- **Webhook 事件**：接收飞书事件推送（兼容 `/webhooks/lark` 和 `/webhooks/feishu` 两个路径）
- **认证方式**：使用 App ID + App Secret 获取 Tenant Access Token

### 阿里云短信
- **场景模板**：支持注册、登录、重置密码等多场景模板配置
- **防刷机制**：验证码发送频率限制与过期管理
- **SDK 版本**：使用 `@alicloud/dysmsapi20170525` 4.1.2

### OpenAI
- **集成能力**：智能摘要、内容分析等 AI 功能
- **配置灵活**：支持自定义 Base URL（兼容 Azure OpenAI 等代理服务）

## 开发规范

### 代码风格
- **格式化**：Prettier（2 空格缩进、单引号、尾随逗号）
- **Lint**：ESLint + @typescript-eslint + typescript-eslint 8.20
- **命名约定**：
  - 文件名：kebab-case（`user-profile.service.ts`）
  - 类/接口：PascalCase（`UserProfileService`）
  - 变量/函数：camelCase（`getUserProfile`）
  - 常量：UPPER_SNAKE_CASE（`JWT_SECRET`）
  - DTO 后缀：`CreateUserDto`、`UpdateUserDto`
  - 守卫后缀：`JwtAuthGuard`
  - 装饰器后缀：`@Public()`、`@CurrentUser()`

### 模块组织
- **按领域分组**：每个功能模块包含 controller/service/repository/dto/enums
- **服务拆分**：按用例拆分服务（如 auth 模块拆分为 register/login/password/token 等服务）
- **路径别名**：使用 `@/` 引用 `src/` 下的模块，避免相对路径地狱
- **共享代码**：可复用的集成适配器放在 `src/integrations/`

### 测试规范
- **测试框架**：Jest + Supertest
- **测试分层**：
  - Unit：`src/**/*.spec.ts`（单元测试，覆盖率 ≥80%）
  - Integration：`test/integration/**/*.int-spec.ts`（集成测试）
  - System：`test/system/**/*.spec.ts`（系统测试）
  - E2E：`test/e2e/**/*.e2e-spec.ts`（端到端测试）
- **覆盖率要求**：statements/branches/functions/lines 均 ≥80%
- **CI 检查**：PR 前必须运行 `pnpm test:ci` 确保所有测试通过

### Git 提交规范
遵循 Conventional Commits：

```
feat(meeting): 新增会议统计分析接口
fix(auth): 修复刷新令牌过期判断逻辑
refactor(user): 重构用户资料更新服务
test(verification): 补充验证码发送单元测试
chore(deps): 升级 Prisma 到 6.10.1
docs(readme): 更新 API 文档说明
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

## 安全与部署建议

- 切勿提交 `.env`；基于 `.env.example` 新增配置
- 生产环境务必更换并管理好 `JWT_*` 与第三方 Secret
- 腾讯会议开放 API 建议配置服务器出口 IP 白名单

## 安全与部署

### 安全最佳实践
- **环境变量**：切勿提交 `.env` 文件，所有敏感配置基于 `.env.example` 管理
- **密钥管理**：生产环境必须更换所有默认密钥（`JWT_*`、第三方 Secret）
- **Token 安全**：
  - Access Token 短期有效（推荐 15 分钟）
  - Refresh Token 长期有效（推荐 7 天）
  - 登出后立即撤销 Token（黑名单机制）
- **IP 白名单**：腾讯会议 API 需配置服务器出口 IP
- **密码策略**：使用 bcryptjs 加密，salt rounds ≥10
- **验证码防刷**：限制发送频率（60 秒/次）与有效期（5 分钟）

### 部署建议
- **多实例部署**：使用 Redis 共享 Token 黑名单与会话状态
- **数据库连接池**：配置合理的 Prisma 连接池大小
- **日志管理**：生产环境建议接入日志收集系统（如 ELK）
- **监控告警**：监控 API 响应时间、错误率、队列积压等指标
- **备份策略**：定期备份数据库（`pnpm db:backup`）

### Docker 部署
```bash
# 构建镜像
docker build -t lulab-backend .

# 使用 docker-compose 启动
docker-compose up -d

# 阿里云环境
docker-compose -f docker-compose.aliyun.yml up -d
```

## 许可

MIT License

## 贡献指南

欢迎提交 Issue 和 Pull Request！

- 新功能开发：请先创建 Issue 讨论需求与设计
- Bug 修复：请附上复现步骤与环境信息
- 代码规范：遵循项目的 ESLint 与 Prettier 配置
- 测试覆盖：新增代码必须包含单元测试（覆盖率 ≥80%）

如需补充飞书 Webhook 的签名校验与完整事件处理，或添加新的会议平台接入，请创建 Issue 讨论与排期。
