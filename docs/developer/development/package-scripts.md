# Package.json 命令说明

本文档详细说明了 Nove API 项目中 package.json 文件定义的各种脚本命令的用途和使用方法。

## 开发命令

### `build`
```bash
npm run build
```
编译 TypeScript 代码为 JavaScript，生成可执行的生产版本文件到 `dist/` 目录。

### `start`
```bash
npm run start
```
启动应用程序（生产模式）。需要先执行 `build` 命令。

### `start:dev`
```bash
npm run start:dev
```
以开发模式启动应用程序，启用文件监视器，文件变化时自动重新编译和重启。

### `start:debug`
```bash
npm run start:debug
```
以调试模式启动应用程序，启用文件监视器和调试功能。

### `start:prod`
```bash
npm run start:prod
```
以生产模式启动应用程序，运行已编译的版本（等同于 `node dist/main`）。

## 代码质量命令

### `format`
```bash
npm run format
```
使用 Prettier 格式化代码，自动修正以下目录中的 TypeScript 文件：
- `src/**/*.ts`
- `test/**/*.ts`
- `prisma/**/*.ts`

### `lint`
```bash
npm run lint
```
使用 ESLint 检查并自动修复以下目录中的 TypeScript 代码：
- `src/**/*.ts`
- `apps/**/*.ts`
- `libs/**/*.ts`
- `test/**/*.ts`

### `compodoc`
```bash
npm run compodoc
```
使用 Compodoc 生成 API 文档，基于 tsconfig.json 配置，生成静态文档网站并自动在浏览器中打开。

## 测试命令

### `test`
```bash
npm run test
```
运行 Jest 测试框架执行所有测试。

### `test:watch`
```bash
npm run test:watch
```
以监视模式运行测试，文件变化时自动重新运行相关测试。

### `test:cov`
```bash
npm run test:cov
```
运行测试并生成代码覆盖率报告。

### `test:debug`
```bash
npm run test:debug
```
以调试模式运行测试，允许在测试代码中设置断点进行调试。

### `test:unit`
```bash
npm run test:unit
```
仅运行单元测试。

### `test:unit:watch`
```bash
npm run test:unit:watch
```
以监视模式运行单元测试。

### `test:integration`
```bash
npm run test:integration
```
仅运行集成测试。

### `test:integration:watch`
```bash
npm run test:integration:watch
```
以监视模式运行集成测试。

### `test:system`
```bash
npm run test:system
```
仅运行系统测试。

### `test:system:watch`
```bash
npm run test:system:watch
```
以监视模式运行系统测试。

### `test:e2e`
```bash
npm run test:e2e
```
仅运行端到端测试。

### `test:all`
```bash
npm run test:all
```
运行所有类型的测试（单元、集成、系统、端到端）。

### `test:ci`
```bash
npm run test:ci
```
在 CI/CD 环境中运行所有测试并生成覆盖率报告。

## 数据库命令

### `db:generate`
```bash
npm run db:generate
```
基于 Prisma schema 生成 Prisma Client，确保类型安全的数据库访问。

### `db:push`
```bash
npm run db:push
```
将 Prisma schema 中的更改直接推送到数据库，不创建迁移文件（适用于开发环境）。

### `db:migrate`
```bash
npm run db:migrate
```
创建并应用数据库迁移，将 schema 更改同步到数据库（适用于生产环境）。

### `db:studio`
```bash
npm run db:studio
```
启动 Prisma Studio，一个可视化的数据库管理界面，可在浏览器中查看和编辑数据。

### `db:reset`
```bash
npm run db:reset
```
重置数据库，删除所有数据并重新应用所有迁移。

### `db:seed`
```bash
npm run db:seed
```
运行数据库种子脚本，填充初始数据。

### `db:cleandata`
```bash
npm run db:cleandata
```
清理数据库中的所有数据，但保留表结构。

### `db:drop`
```bash
npm run db:drop
```
删除数据库（交互式确认）。

### `db:drop:force`
```bash
npm run db:drop:force
```
强制删除数据库，无需确认。

### `db:seed:reset`
```bash
npm run db:seed:reset
```
重置数据库并重新运行种子脚本。

### `db:backup`
```bash
npm run db:backup
```
创建数据库备份文件。

## 验证命令

### `validate:tencent-api`
```bash
npm run validate:tencent-api
```
验证腾讯会议 API 配置是否正确，检查 API 密钥和网络连接。

## 使用建议

### 开发流程
1. 克隆项目后，首先运行 `npm install` 安装依赖
2. 运行 `db:generate` 生成 Prisma Client
3. 运行 `db:migrate` 应用数据库迁移
4. 运行 `db:seed` 填充初始数据（可选）
5. 使用 `start:dev` 启动开发服务器

### 代码提交前
1. 运行 `lint` 检查并修复代码风格问题
2. 运行 `format` 格式化代码
3. 运行 `test:unit` 确保单元测试通过

### 生产部署
1. 运行 `build` 编译项目
2. 运行 `db:migrate` 应用数据库迁移
3. 使用 `start:prod` 启动生产服务器

### 数据库管理
- 开发阶段：使用 `db:push` 快速同步 schema 更改
- 生产环境：使用 `db:migrate` 进行版本化迁移管理
- 定期备份：使用 `db:backup` 创建数据库备份