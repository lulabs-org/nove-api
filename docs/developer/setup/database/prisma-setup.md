# Prisma 集成说明

本项目已成功集成 Prisma ORM，提供类型安全的数据库访问。

## 已完成的配置

### 1. 安装的依赖

- `prisma` - Prisma CLI 工具
- `@prisma/client` - Prisma 客户端
- `@nestjs/config` - 环境变量配置

### 2. 数据库配置

- 使用 PostgreSQL 数据库
- 数据库连接配置在 `.env` 文件中
- 数据库 schema 定义在 `prisma/schema.prisma`

### 3. 数据模型

所有的数据模型统一集中定义在项目根目录的 `prisma/schema.prisma` 文件中，包括但不限于：

- `User`, `Profile` - 用户与档案管理
- `Organization`, `Department`, `OrgMember` - 多租户组织结构
- `Role`, `Permission` - RBAC 角色与权限
- `Meeting`, `MeetingParticipant`, `MeetingRecording` - 会议与转写相关
- `VerificationLog`, `LoginLog` - 验证码与登录统计
- `ApiKey` - API 密钥管理

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

1. **修改数据模型**：编辑 `prisma/schema.prisma` 文件
2. **应用更改**：开发环境运行 `pnpm db:push`，如果是协作/生产前置准备，运行 `pnpm db:migrate`
3. **生成客户端**：运行 `pnpm db:generate`（大部分情况下 push/migrate 会自动生成）
4. **类型安全**：使用生成的 Prisma 类型确保类型安全

## 文件结构

```text

src/
├── prisma.service.ts     # Prisma 服务
├── user.service.ts       # 用户业务逻辑
├── user.controller.ts    # 用户控制器
└── app.module.ts         # 主模块

prisma/
├── schema.prisma         # 数据库 schema
└── migrations/           # 数据库迁移文件

generated/
└── prisma/              # 生成的 Prisma 客户端
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
   npx prisma migrate dev --name init
   ```

## 注意事项

- `.env` 文件包含数据库连接信息，不要提交到版本控制
- 确保 PostgreSQL 服务正在运行
- 修改 schema 后记得运行迁移命令
- 生产环境请使用安全的数据库凭据
