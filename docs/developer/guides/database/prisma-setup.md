# Prisma 集成说明

本项目使用 Prisma ORM **7.10.0**，提供类型安全的 PostgreSQL 访问。

## Prisma 7 运行要求与升级

- Node.js 22.12+，CI 和 Docker 使用 22.23.1；pnpm 9.15.9。
- `prisma`、`@prisma/client`、`@prisma/adapter-pg` 固定到相同版本，避免 `latest` 引入下一个大版本或预发布版本。
- 使用 Prisma 7 默认的 `prisma-client` 生成器，将客户端显式生成到 `src/generated/prisma`；生成目录不提交到 Git。项目继续按现有 NestJS CommonJS 配置编译生成代码。
- CLI 的 schema 目录、迁移目录、seed 和数据库地址由根目录 `prisma.config.ts` 配置；配置显式加载 `.env` 并展开 `${VARIABLE}` 引用，保留部署环境已注入的变量。`prisma/schema.prisma` 不再声明连接地址。
- `prisma generate` 不需要数据库凭据，便于 Docker 构建；迁移等数据库命令必须提供 `DATABASE_URL`。
- 服务及 TypeScript 数据脚本使用 `createPrismaAdapter()`。服务销毁时释放连接池。
- 默认每个客户端最多 10 个连接，连接/排队超时 10 秒，空闲连接保留 300 秒。URL 的 `schema`、`connection_limit`、`pool_timeout`、`connect_timeout`、`max_idle_connection_lifetime` 映射到驱动配置；`pool_timeout` 优先于 `connect_timeout`。node-postgres 使用同一超时控制建连与排队，不能完全复刻旧引擎的两个独立超时。
- SSL 使用 node-postgres 的证书验证行为，不全局关闭验证。私有 CA 需配置 `sslrootcert`；发布前核对部署环境的证书链。
- Prisma 7 的 `migrate dev` / `migrate reset` 不再自动运行 seed；需要数据初始化时显式运行 `pnpm db:seed`，生成客户端使用 `pnpm db:generate`。
- 单组织运行环境要求数据库中恰好存在一个启用组织。新数据库只需初始化组织时，运行 `pnpm exec tsx prisma/seed.ts --module organization`；不要为了启动服务而写入整套模拟数据。

升级依赖不需要新增业务 migration，也不要重写历史 migration。建议执行：

```bash
pnpm install --frozen-lockfile
pnpm db:generate
pnpm exec prisma validate
pnpm build
pnpm exec jest --selectProjects unit --runInBand
# DATABASE_URL 必须指向独立测试库；以下命令会应用迁移并写入测试数据。
pnpm db:migrate:prod
pnpm exec jest --selectProjects integration --runInBand test/integration/prisma/prisma7.int-spec.ts
```


## 已完成的配置

### 1. 安装的依赖

- `prisma` - Prisma CLI 工具
- `@prisma/client` - Prisma 客户端
- `@prisma/adapter-pg` - PostgreSQL 驱动适配器
- `@nestjs/config` - 环境变量配置

### 2. 数据库配置

- 使用 PostgreSQL 数据库
- 数据库连接配置在 `.env` 文件中
- 数据库 schema 定义在 `prisma/schema.prisma`

### 3. 数据模型

为了解决单一文件过大的问题，本项目采用了**多文件 Prisma Schema 管理方案**。数据模型分散定义在 `prisma/models/` 目录下的各个 `.prisma` 文件中，包括但不限于：

- `user.prisma`, `user_profile.prisma`, `user_platform.prisma` - 用户与多平台账号
- `org.prisma`, `dept.prisma`, `org_member.prisma` - 多租户组织结构
- `role.prisma`, `permission.prisma` - RBAC 角色与权限点定义
- `meet.prisma`, `meet_participant.prisma`, `meet_summary.prisma` - 会议与AI记录相关
- `order.prisma`, `order_refund.prisma` - 订单与退款
- `webhook_log.prisma`, `task.prisma` - 系统异步与外部日志

### 4. NestJS 服务

系统在 `src/prisma/prisma.service.ts` 中封装了 `PrismaService`，负责在 Nest 生命周期连接与销毁数据库。

## 常用 Prisma 命令

项目中通过 `package.json` 的 `scripts` 封装了标准的数据库维护命令：

### 生成客户端

```bash
pnpm db:generate
```

### 应用结构变更到数据库（开发环境）

```bash
pnpm db:push
```

### 创建生产迁移文件

```bash
pnpm db:migrate
```

### 生产环境部署迁移

```bash
pnpm db:migrate:prod
```

### 查看数据库 GUI (Prisma Studio)

```bash
pnpm db:studio
```

### 重置数据库与种子数据 (⚠️会导致数据丢失)

```bash
pnpm db:reset
```

## 开发建议

1. **修改数据模型**：请编辑 `prisma/models/` 目录下的相应 `.prisma` 文件。**切勿直接修改根目录下的 `schema.prisma` 文件**。
2. **应用更改**：由于使用了拆分方案，请确保您运行的 `pnpm db:generate` 或相关的自定义合并脚本会将 `models/` 下的文件合并。如果是开发环境，可以运行 `pnpm db:push`，如果是协作/生产前置准备，运行 `pnpm db:migrate`。
3. **生成客户端**：运行 `pnpm db:generate`（大部分情况下 push/migrate 会自动生成）。
4. **类型安全**：使用生成的 Prisma 类型确保类型安全。

## 文件结构

```text
src/
├── app.module.ts         # 主模块
├── user/
│   ├── user.module.ts
│   ├── user.controller.ts
│   ├── services/
│   └── repositories/     # 数据访问层隔离
└── prisma/
    └── prisma.service.ts # Prisma 服务封装

prisma/
├── schema.prisma         # 自动合并生成的完整 schema（勿直接修改）
├── models/               # 数据模型定义文件（实际修改处）
│   ├── user.prisma
│   └── ...
├── migrations/           # 数据库迁移文件
└── seed-utils/           # 种子数据工具
```

## PostgreSQL 设置

### 本地开发环境设置

1. **安装 PostgreSQL**

   ```bash
   # macOS (使用 Homebrew)
   brew install postgresql
   brew services start postgresql

   # 或使用 Docker
   docker run --name postgres-dev -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres
   ```

2. **创建数据库**

   ```bash
   # 连接到 PostgreSQL
   psql -U postgres

   # 创建数据库
   CREATE DATABASE nove_api;

   # 退出
   \q
   ```

3. **配置连接字符串**
   在 `.env` 文件中更新 `DATABASE_URL`：

   ```text

   DATABASE_URL="postgresql://postgres:password@localhost:5432/nove_api?schema=public"
   ```

4. **运行迁移**

   ```bash
   pnpm db:migrate
   ```

## 注意事项

- `.env` 文件包含数据库连接信息，不要提交到版本控制
- 确保 PostgreSQL 服务正在运行
- 修改 schema 后记得运行迁移命令
- 生产环境请使用安全的数据库凭据
