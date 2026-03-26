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

## 📚 项目文档

Nove API 的所有文档（包括架构设计、API 参考、开发指南、第三方集成说明等）已迁移并整合为 [完整的文档站点](./docs)。

- [**👨‍💻 开发者文档**](./docs/developer/index.md) - 面向开发团队成员，包含环境配置、技术实现细节、架构设计、开发与提交规范等。
- [**👤 用户文档**](./docs/user/index.md) - 面向系统最终用户与 API 调用方，包含如何使用系统功能、API 接口指引、常见问题等。
- [**📖 完整文档目录**](./docs/README.md) - 浏览所有文档入口。

> **提示**：您也可以在本地运行以下命令启动文档站点：
> ```bash
> cd docs
> pnpm install
> pnpm run docs:dev
> ```
> 随后访问 `http://localhost:5173` 即可获得最佳的阅读体验。

---

## 🚀 快速开始

如果想马上启动后端服务，请参考以下精简步骤。详细步骤请参考 [环境配置与部署指南](./docs/developer/setup/deployment/guide.md)：

### 1. 环境准备

- Node.js 18+
- pnpm 8+
- PostgreSQL 14+
- Redis 6+

### 2. 安装与配置

```bash
# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env
# 在 .env 中填入 DATABASE_URL, REDIS_HOST 等必要配置

# 初始化数据库
pnpm db:generate
pnpm db:push
```

### 3. 启动服务

```bash
# 启动开发服务器（热重载）
pnpm start:dev
```

启动后可访问：
- **Swagger API 文档**: `http://localhost:3000/api`
- **GraphQL Playground**: `http://localhost:3000/graphql`

---

## 📄 许可

[MIT License](./LICENSE)
