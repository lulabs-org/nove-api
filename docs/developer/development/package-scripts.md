# Package.json 命令说明

本文档详细说明了 Nove API 项目中 package.json 文件定义的各种脚本命令的用途和使用方法。

> [!NOTE]
> 本项目使用 **pnpm** 作为包管理器。以下所有命令均使用 `pnpm` 前缀。

## 开发命令

### `build`
```bash
pnpm build
```
编译 TypeScript 代码为 JavaScript，生成可执行的生产版本文件到 `dist/` 目录。

### `start`
```bash
pnpm start
```
启动应用程序（生产模式）。需要先执行 `build` 命令。

### `start:dev`
```bash
pnpm start:dev
```
以开发模式启动应用程序，启用文件监视器，文件变化时自动重新编译和重启。

### `start:debug`
```bash
pnpm start:debug
```
以调试模式启动应用程序，启用文件监视器和调试功能。

### `start:prod`
```bash
pnpm start:prod
```
以生产模式启动应用程序，运行已编译的版本（等同于 `node dist/main`）。

## 代码质量命令

### `format`
```bash
pnpm format
```
使用 Prettier 格式化代码，自动修正以下目录中的 TypeScript 文件：
- `src/**/*.ts`
- `test/**/*.ts`
- `prisma/**/*.ts`

### `lint`
```bash
pnpm lint
```
使用 ESLint 检查并自动修复以下目录中的 TypeScript 代码：
- `src/**/*.ts`
- `apps/**/*.ts`
- `libs/**/*.ts`
- `test/**/*.ts`

### `lint:prisma`
```bash
pnpm lint:prisma
```
使用 ESLint 检查并自动修复 `prisma/**/*.ts` 目录中的代码（如种子脚本）。

### `compodoc`
```bash
pnpm compodoc
```
使用 Compodoc 生成 API 文档，基于 tsconfig.json 配置，生成静态文档网站并自动在浏览器中打开。

## 测试命令

### `test`
```bash
pnpm test
```
运行 Jest 测试框架执行所有测试。

### `test:watch`
```bash
pnpm test:watch
```
以监视模式运行测试，文件变化时自动重新运行相关测试。

### `test:cov`
```bash
pnpm test:cov
```
运行测试并生成代码覆盖率报告。

### `test:debug`
```bash
pnpm test:debug
```
以调试模式运行测试，允许在测试代码中设置断点进行调试。

### `test:unit`
```bash
pnpm test:unit
```
仅运行单元测试（`--selectProjects unit`）。

### `test:unit:watch`
```bash
pnpm test:unit:watch
```
以监视模式运行单元测试。

### `test:integration`
```bash
pnpm test:integration
```
仅运行集成测试（`--selectProjects integration`）。

### `test:integration:watch`
```bash
pnpm test:integration:watch
```
以监视模式运行集成测试。

### `test:system`
```bash
pnpm test:system
```
仅运行系统测试（`--selectProjects system`）。

### `test:system:watch`
```bash
pnpm test:system:watch
```
以监视模式运行系统测试。

### `test:e2e`
```bash
pnpm test:e2e
```
仅运行端到端测试（`--selectProjects e2e`）。

### `test:all`
```bash
pnpm test:all
```
运行所有类型的测试（单元、集成、系统、端到端）。

### `test:ci`
```bash
pnpm test:ci
```
在 CI/CD 环境中运行所有测试并生成覆盖率报告。

## 数据库命令

### `db:generate`
```bash
pnpm db:generate
```
基于 Prisma schema 生成 Prisma Client，确保类型安全的数据库访问。

### `db:push`
```bash
pnpm db:push
```
将 Prisma schema 中的更改直接推送到数据库，不创建迁移文件（适用于开发环境）。

### `db:migrate`
```bash
pnpm db:migrate
```
创建并应用数据库迁移（开发模式，`prisma migrate dev`），将 schema 更改同步到数据库。

### `db:migrate:status`
```bash
pnpm db:migrate:status
```
查看数据库迁移状态，检查哪些迁移已应用、哪些待执行。

### `db:migrate:prod`
```bash
pnpm db:migrate:prod
```
在生产环境中部署迁移（`prisma migrate deploy`），仅执行已有的迁移文件，不创建新迁移。

### `db:studio`
```bash
pnpm db:studio
```
启动 Prisma Studio，一个可视化的数据库管理界面，可在浏览器中查看和编辑数据。

### `db:reset`
```bash
pnpm db:reset
```
重置数据库，删除所有数据并重新应用所有迁移。

### `db:seed`
```bash
pnpm db:seed
```
运行数据库种子脚本，填充初始数据（使用模拟数据）。

### `db:seed:real`
```bash
pnpm db:seed:real
```
运行数据库种子脚本，使用真实数据填充（带 `--real` 参数）。

### `db:cleandata`
```bash
pnpm db:cleandata
```
清理数据库中的所有数据，但保留表结构。

### `db:drop`
```bash
pnpm db:drop
```
删除数据库（交互式确认）。

### `db:drop:force`
```bash
pnpm db:drop:force
```
强制删除数据库，无需确认。**⚠️ 谨慎使用**。

### `db:seed:reset`
```bash
pnpm db:seed:reset
```
重置数据库并重新运行种子脚本（使用模拟数据）。

### `db:seed:reset:real`
```bash
pnpm db:seed:reset:real
```
重置数据库并重新运行种子脚本（使用真实数据）。

### `db:backup`
```bash
pnpm db:backup
```
创建数据库备份文件（执行 `scripts/shell/backup.sh`）。

## MCP 调试命令

### `mcp:inspect`
```bash
pnpm mcp:inspect
```
使用 MCP Inspector 连接已编译的应用（`dist/main.js`），用于调试 MCP Server 功能。

### `mcp:inspect:dev`
```bash
pnpm mcp:inspect:dev
```
使用 MCP Inspector 连接开发模式的应用。

### `mcp:inspect:sse`
```bash
pnpm mcp:inspect:sse
```
使用 MCP Inspector 通过 **SSE 传输协议** 连接本地运行的 MCP Server（`http://localhost:3000/sse`）。

### `mcp:inspect:http`
```bash
pnpm mcp:inspect:http
```
使用 MCP Inspector 通过 **HTTP 传输协议** 连接本地运行的 MCP Server（`http://localhost:3000/mcp`）。

## 文档命令

### `docs:dev`
```bash
pnpm docs:dev
```
启动文档站点开发服务器（VitePress dev mode）。

### `docs:build`
```bash
pnpm docs:build
```
构建文档站点的静态文件。

## 使用建议

### 开发流程
1. 克隆项目后，首先运行 `pnpm install` 安装依赖
2. 运行 `pnpm db:generate` 生成 Prisma Client
3. 运行 `pnpm db:migrate` 应用数据库迁移
4. 运行 `pnpm db:seed` 填充初始数据（可选）
5. 使用 `pnpm start:dev` 启动开发服务器

### 代码提交前
1. 运行 `pnpm lint` 检查并修复代码风格问题
2. 运行 `pnpm format` 格式化代码
3. 运行 `pnpm test:unit` 确保单元测试通过

### 生产部署
1. 运行 `pnpm build` 编译项目
2. 运行 `pnpm db:migrate:prod` 应用数据库迁移
3. 使用 `pnpm start:prod` 启动生产服务器

### 数据库管理
- 开发阶段：使用 `pnpm db:push` 快速同步 schema 更改
- 生产环境：使用 `pnpm db:migrate:prod` 进行版本化迁移管理
- 定期备份：使用 `pnpm db:backup` 创建数据库备份