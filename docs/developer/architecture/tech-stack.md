# 技术栈

本页以当前 `package.json`、`Dockerfile`、`docker-compose.yml` 和 CI 配置为基线。依赖的精确补丁版本以锁文件为准。

## 核心运行时

| 技术 | 当前基线 | 用途 |
|---|---:|---|
| Node.js | 22（Docker）；20（CI） | 服务端运行时 |
| TypeScript | 5.7 | 应用语言，编译目标 ES2023 |
| NestJS | 11 | 模块化架构、依赖注入、REST 服务 |
| Prisma | 7.10.0 | PostgreSQL 类型安全访问与迁移 (基于 `prisma.config.ts` 与 `@prisma/adapter-pg`) |
| PostgreSQL | 17.5（Compose）；15（CI） | 主业务数据库 |
| Redis | 8.2（Compose）；7（CI） | BullMQ 队列与分布式缓存，基于标准 `REDIS_URL` |
| pnpm | 9（CI） | 依赖与多包脚本管理 |

仓库未在 `package.json` 中固定 `engines` 或 `packageManager`；本地开发应优先对齐 CI 的 Node 20 + pnpm 9，容器行为则以 Node 22 镜像为准。

## API 与基础设施

- **REST / OpenAPI**：`@nestjs/swagger` + `nestjs-redoc`，运行时自动生成 Swagger UI (`/api`)、OpenAPI JSON (`/api-json`) 和美化版 ReDoc (`/docs`)。
- **GraphQL**：Apollo Server 4 + `@nestjs/graphql`，非生产环境开放 Playground 与 introspection (`/graphql`)。
- **异步任务队列**：BullMQ 5 + `@nestjs/bullmq`，Bull Board (`/queues`) 提供受 HTTP Basic Auth 保护的队列可视化看板。
- **认证与鉴权**：Passport、JWT、UnifiedAuthGuard、CASL 细粒度数据权限与 RBAC。
- **输入校验与序列化**：`class-validator`、`class-transformer`，全局启用 `ValidationPipe`。
- **AI 智能体基础设施**：`@modelcontextprotocol/sdk` 与 `@rekog/mcp-nest`，支持 SSE、Streamable HTTP 传输协议。
- **测试框架**：Jest 29、`ts-jest`、Supertest；按 `unit`、`integration`、`system`、`e2e` 分项目运行。
- **文档系统**：VitePress 1.6 + `vitepress-plugin-mermaid` + Vue 3。

## 外部集成与第三方 SDK

- **会议生态**：腾讯会议 (TMeet OpenAPI/Webhook)、飞书多维表格与事件 SDK (`@larksuiteoapi/node-sdk`)。
- **企业微信与协同**：Hermes 机器人网关，使用 `@wecom/crypto` 进行 AES-CBC 消息体加解密与签名校验。
- **AI 大模型**：OpenAI 官方 SDK、火山引擎方舟 (Ark) 及自定义兼容供应商。
- **支付与交易**：Stripe SDK (`stripe`)、微信小店 Webhook 与订单同步。
- **通讯与安全**：Nodemailer (SMTP 邮件池)、阿里云短信 SDK (`@alicloud/dysmsapi20170525`)、阿里云云安全中心 (`@alicloud/sas20181203`)、本地 ClamAV 病毒扫描。
- **存储**：阿里云 OSS (`ali-oss`) 与本地多级文件持久化。

动态业务配置（邮件、AI、腾讯会议、飞书、微信小店、企业微信等）在首次启动时可从环境变量初始化，之后统一由管理后台持久化在 `system_configs` 并采用 `SYSTEM_ENCRYPTION_KEY` 进行 AES-256-GCM 加密，读取时自动脱敏。

## 版本更新原则

升级运行时或依赖时，应同步检查 `Dockerfile`、`.github/workflows/ci.yml`、`docker-compose.yml`、根锁文件和 `docs/pnpm-lock.yaml`。涉及 Prisma 时必须运行 `pnpm db:generate`、`pnpm exec prisma validate`、迁移和相关测试。
