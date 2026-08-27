<h1 align="center">Nove API (Core Service)</h1>

<p align="center">
  <b>Nove 生态系统</b>的核心后端服务。为 <b>Nove Admin (管理后台)</b>、<b>Nove CLI (命令行工具)</b> 以及第三方接入提供坚实可靠的底层 API 支撑。
</p>
<p align="center">
  基于 NestJS 构建，提供企业级多租户架构、OAuth2 授权体系、组织与用户管理、会议记录及智能化统计分析；并具备强大的第三方音视频服务、企业协同办公套件及 AI 大模型能力的深度集成方案。
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

## ✨ 核心特性

- **🏢 企业级架构**：基于 NestJS 构建，采用模块化设计，内置强大的依赖注入和控制反转机制，保障代码的高可维护性。
- **🔐 完善的身份认证**：内置 OAuth2 服务端能力，支持多渠道登录、JWT 鉴权及灵活的 API Key 机制。
- **👥 多租户与权限控制**：支持复杂的组织架构映射，提供细粒度的 RBAC/ABAC 权限管理。
- **🧩 深度集成能力**：架构设计上充分考虑了外部系统扩展，支持无缝对接各大主流音视频会议平台、企业协同办公软件及领先的 AI 大模型服务。
- **🚀 高性能与高可用**：采用 PostgreSQL 作为主数据库，结合 Prisma ORM 保证数据访问类型安全；结合 Redis 与 BullMQ 提供强大的异步任务调度与队列处理能力。

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
# 1. 安装依赖
pnpm install

# 2. 配置环境变量
cp .env.example .env
# 请在 .env 中填入 DATABASE_URL, REDIS_HOST 等必要配置

# 3. 初始化数据库结构
pnpm db:generate
pnpm db:push
```

### 3. 启动服务

```bash
# 启动开发服务器（支持热重载）
pnpm start:dev
```

启动成功后可访问以下本地服务：
- **Swagger API 接口文档**: `http://localhost:3000/api`
- **GraphQL 调试面板 (Playground)**: `http://localhost:3000/graphql`

---

## 📄 许可

本项目采用 [MIT License](./LICENSE) 开源协议。
