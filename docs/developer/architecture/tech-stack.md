# 技术栈

本页以当前 `package.json`、`Dockerfile`、`docker-compose.yml` 和 CI 配置为基线。依赖的精确补丁版本以锁文件为准。

## 核心运行时

| 技术 | 当前基线 | 用途 |
|---|---:|---|
| Node.js | 22（Docker）；20（CI） | 服务端运行时 |
| TypeScript | 5.7 | 应用语言，编译目标 ES2023 |
| NestJS | 11 | 模块、依赖注入、REST 服务 |
| Prisma | 6.10 | PostgreSQL 类型安全访问与迁移 |
| PostgreSQL | 17.5（Compose）；15（CI） | 主业务数据库 |
| Redis | 8.2（Compose）；7（CI） | BullMQ 队列与运行时数据 |
| pnpm | 9（CI） | 依赖与脚本管理 |

仓库未在 `package.json` 中固定 `engines` 或 `packageManager`；本地开发应优先对齐 CI 的 Node 20 + pnpm 9，容器行为则以 Node 22 镜像为准。

## API 与基础设施

- REST/OpenAPI：`@nestjs/swagger`，运行时提供 Swagger UI、OpenAPI JSON 和 Redoc。
- GraphQL：Apollo Server 4 + `@nestjs/graphql`，非生产环境开放 Playground 与 introspection。
- 队列：BullMQ 5 + `@nestjs/bullmq`，Bull Board 提供受 Basic Auth 保护的队列页面。
- 认证与校验：Passport、JWT、`class-validator`、`class-transformer`。
- MCP：`@modelcontextprotocol/sdk` 与 `@rekog/mcp-nest`。
- 测试：Jest 29、`ts-jest`、Supertest；按 unit、integration、system、e2e 分项目运行。
- 文档：VitePress 1.6、Mermaid、Vue 3。

## 外部集成

当前源码包含腾讯会议、飞书、微信小店、阿里云短信、SMTP 邮件和 OpenAI/LLM 抽象。集成凭据来自环境变量或全局系统配置；敏感字段在数据库中加密，管理接口读取时返回掩码。

## 版本更新原则

升级运行时或依赖时，应同步检查 `Dockerfile`、`.github/workflows/ci.yml`、`docker-compose.yml`、根锁文件和 `docs/pnpm-lock.yaml`。涉及 Prisma 时必须运行 `pnpm db:generate`、`pnpm prisma validate`、迁移和相关测试。
