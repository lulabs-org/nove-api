# 部署指南

本文以仓库当前 `Dockerfile`、`docker-compose.yml`、`.env.example` 和 GitHub Actions 为准。容器部署是推荐路径；手工部署适用于受控主机。

## 准备配置

```bash
cp .env.example .env
```

生产环境至少检查：

- `DATABASE_URL` 与 `POSTGRES_*`
- `REDIS_*` / `REDIS_URL`
- `JWT_SECRET`、`JWT_REFRESH_SECRET` 及有效期
- `CORS_ORIGINS`、`CORS_ORIGIN_REGEXES`、`CORS_CREDENTIALS`
- `BULL_BOARD_USER`、`BULL_BOARD_PASSWORD`
- 腾讯会议、飞书、微信小店、SMTP 和 LLM 凭据（仅在全新数据库首次启动时导入；短信仍按原部署配置）
- 头像存储所需的 `ALIYUN_OSS_REGION`、`ALIYUN_OSS_BUCKET`、`ALIYUN_OSS_PUBLIC_BASE_URL`，以及可选的 `ALIYUN_OSS_SIGNED_URL_EXPIRES_SECONDS`
- `SYSTEM_ENCRYPTION_KEY`（用于动态系统配置，必须长期保留且不能直接轮换）

不要直接使用 `.env.example` 中的占位密钥。生产凭据应由部署平台的 Secret 管理能力注入，并限制 `.env` 文件权限。

首次部署新版服务配置时，先保留原有五组服务环境变量。确认 `SYSTEM_CONFIG_ENV_IMPORT_V1` 已写入、后台字段已掩码并完成连接测试后，再从部署平台移除这些服务密钥。后续配置统一通过后台管理；修改环境变量或删除后台配置都不会触发再次导入。

个人头像写入 `avatars/{userId}/{uuid}.webp`。Bucket 与对象均保持私有，可以继续开启“阻止公共访问”；不要开放匿名读取或写入。数据库保存稳定的本站托管对象地址，API 在返回当前用户资料和 `/api/auth/me` 时生成短期 GET 签名 URL，默认有效期为 600 秒，且不会把签名 URL 写入数据库。`ALIYUN_OSS_PUBLIC_BASE_URL` 用于识别本站托管对象，通常填写 Bucket 公网域名。服务端 RAM 身份只授予该前缀所需的 `PutObject`、`GetObject` 和 `DeleteObject` 权限。缺少任一必要 OSS 配置或 OSS 拒绝上传时，其他 API 仍可启动，但头像上传返回 503；签名生成失败时资料接口仍可返回，只是不包含头像 URL。

## 本地开发

CI 使用 Node 20 + pnpm 9；Docker 使用 Node 22。开发机应选择其中一个已验证组合。

```bash
pnpm install --frozen-lockfile
pnpm db:generate
pnpm db:migrate
pnpm db:seed        # 仅在确实需要初始数据时
pnpm start:dev
```

验证入口：

- 根健康响应：`http://localhost:3000/`
- Meet AI 健康检查：`http://localhost:3000/meet-ai/health`
- Swagger：`http://localhost:3000/api`
- OpenAPI JSON：`http://localhost:3000/api-json`
- GraphQL：`http://localhost:3000/graphql`

## Docker Compose

当前 Compose 不负责构建镜像，先构建本地镜像或设置 `NOVE_IMAGE`：

```bash
docker build -t noveapi:local .
docker compose up -d
docker compose ps
docker compose logs -f nove
```

可通过 `.env` 覆盖 `NOVE_IMAGE`、`NOVE_PORT`、`POSTGRES_PORT`、`REDIS_PORT` 等变量。PostgreSQL 和 Redis 默认映射到宿主机；生产环境若不需要外部访问，应删除端口映射并只保留内部网络。

部署新镜像前执行迁移：

```bash
pnpm db:migrate:prod
```

不要在生产运行 `db:push`、`db:migrate`（dev）或 `db:reset`。迁移和应用发布应具备明确的先后顺序与回滚方案。

## 手工生产部署

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm db:generate
pnpm build
pnpm db:migrate:prod
NODE_ENV=production node dist/src/main.js
```

当前编译产物入口是 `dist/src/main.js`，与 `Dockerfile` 一致。根 `package.json` 的 `start:prod` 仍指向 `dist/main`，在修正脚本前不要把它作为生产启动命令。

使用 systemd、容器编排器或其他进程管理器时，应以非 root 用户运行，向进程发送可转发的终止信号，并将结构化日志输出到平台日志系统。

## 反向代理与网络

- 外部流量只通过 HTTPS 进入 API；PostgreSQL 和 Redis 不暴露公网。
- 保留 Webhook 原始请求头和请求体，不让代理改写签名相关字段。
- 为长连接/SSE 配置合理的读超时和关闭代理缓冲。
- `CORS_ORIGINS` 使用精确域名；启用 Cookie 凭据时不能使用通配符。
- `/queues` 必须配置强 Basic Auth，并尽量限制到内网或运维身份。

## 发布门禁

```bash
pnpm lint
pnpm lint:prisma
pnpm prisma validate
pnpm build
pnpm test:unit
pnpm docs:build
```

涉及外部服务或数据库行为时，再运行对应 integration/system/e2e 测试。真实集成测试必须使用隔离资源和测试凭据。

## 发布后检查

1. 检查根路由、OpenAPI 和关键受保护接口。
2. 确认 Prisma 迁移状态与应用版本一致。
3. 检查 BullMQ 队列、失败任务及 Redis/PostgreSQL 健康状态。
4. 验证至少一个测试 Webhook 的验签、日志和消费链路。
5. 检查日志中没有 Token、密码、完整签名或个人敏感信息。
6. 观察错误率与资源使用，确认后再扩大流量。

## 备份与回滚

数据库变更前创建可验证的 PostgreSQL 备份，并定期演练恢复。应用回滚必须考虑迁移的前后兼容：优先使用扩展—迁移—收缩方式，避免旧版本读取不了新 schema。`pnpm db:backup` 调用仓库脚本，但生产使用前应审查目标路径、保留策略和恢复步骤。
