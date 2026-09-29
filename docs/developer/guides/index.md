# 工程开发与运维指南

本目录指导开发者与运维团队如何在项目中高效协作、开发、测试与交付，不重复描述具体领域业务 API。

## 团队协作与工程规范

- [Trunk-Based Git 协作](./collaboration/git.md)：基于主干开发（TBD）的工作流、短生命周期分支、PR 审查规范与发布门禁。
- [版本控制与发布](./collaboration/version-control.md)：语义化版本控制（SemVer）与发布流程。
- [NestJS 测试规范](./collaboration/testing.md)：单元测试、集成测试与 E2E 规范及 Jest 执行策略。
- [工程脚本说明](./collaboration/scripts.md)：根目录常用命令及构建指令说明。
- [安全开发规范](./collaboration/security.md)：参数校验、SQL 防注入、敏感凭据处理与安全基线。
- [文档维护指南](./collaboration/documentation.md)：开发者与用户文档的维护准则与死链质量控制。

## 数据存储与持久化

- [Prisma 7 配置与迁移](./database/prisma-setup.md)：Prisma 7、`@prisma/adapter-pg` 与开发/生产数据库迁移指南。
- [数据库设计规范](./database/style-guide.md)：表命名、字段约定、外键级联与索引设计准则。

## 部署与运维

- [部署概览](./deployment/overview.md)：环境架构、基础设施依赖与发布模型。
- [生产部署指南](./deployment/guide.md)：Docker 容器化构建、环境变量注入与生产运行实战。
