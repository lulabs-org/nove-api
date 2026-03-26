# Nove API 开发者文档

欢迎来到 Nove API 开发者文档！本文档面向开发团队成员，提供了系统架构、开发指南、核心模块机制、第三方集成实现和环境部署等全面详细的技术文档。

## 📚 文档导览

根据您的职责和当前需求，请参考以下分类内容：

### 🏗️ 架构设计
快速了解项目的宏观系统设计和技术结构：
- [整体架构](architecture/overview.md) - 系统架构概览与进程通信
- [技术栈](architecture/tech-stack.md) - 后端核心技术选型和第三方服务清单
- [数据流设计](architecture/data-flow.md) - 关键业务对象（会议、用户、组织等）的流转逻辑
- [模块设计](architecture/modules.md) - NestJS 系统模块划分和职责
- [项目结构](architecture/project-structure.md) - 源码目录结构及标准组织方式

### ⚙️ 环境搭建
本地环境准备、数据库构建与服务器部署说明：
- **数据库配置**
  - [Prisma 配置](setup/database/prisma-setup.md) - Prisma ORM 集成参数和工作流
  - [数据库规范](setup/database/style-guide.md) - 表结构与字段设计规范
- **部署配置**
  - [部署概述](setup/deployment/overview.md) - 应用部署拓扑与运维概述
  - [部署指南](setup/deployment/guide.md) - 各环境（开发、测试、生产）部署详细指引

### 📖 开发指南
团队协同、代码风格保障与代码质量维持的指导文件：
- [Git 协作](development/git-collaboration.md) - Commit 提交规范与分支模型
- [脚本说明](development/package-scripts.md) - Package.json 中的 NPM 脚本用途查询
- [安全规范](development/security.md) - 安全最佳实践与漏洞防范
- [版本控制](development/version-control.md) - 标签与发版记录管理
- [NestJS 测试规范](development/nestjs-testing-standards.md) - 单元测试与端到端（E2E）覆盖率要求

### 🧩 核心模块
深挖复杂功能的具体实现与原理：
- **认证模块**
  - [认证概述](modules/authentication/overview.md)
  - [注册流程](modules/authentication/registration-flow.md)
  - [登出实现](modules/authentication/logout-implementation.md)
- **API Key 模块**
  - [概述](modules/api-key/overview.md)
  - [使用示例](modules/api-key/examples.md)
  - [变更日志](modules/api-key/changelog.md)
- **MCP Server**
  - [连接指南](modules/mcp/connection-guide.md) - Model Context Protocol AI 集成说明

### 🔌 第三方集成
内外部服务接入机制：
- **飞书/Lark 集成**
  - [集成概述](modules/integrations/lark/overview.md)
  - [集成总结](modules/integrations/lark/summary.md)
  - [Webhook 集成](modules/integrations/lark/webhook/integration.md)
  - **飞书多维表格 (Bitable) 同步**
    - [批量操作](modules/integrations/lark/bitable/batch-operations.md)
    - [Upsert 指南](modules/integrations/lark/bitable/upsert-guide.md)
    - [Upsert 操作](modules/integrations/lark/bitable/upsert-operations.md)
    - [测试指南](modules/integrations/lark/bitable/testing-guide.md)
    - [详细测试指南](modules/integrations/lark/bitable/testing-guide-detailed.md)
    - [录制文件表](modules/integrations/lark/bitable/recording-file-table.md)
- **腾讯会议集成**
  - [集成概述](modules/integrations/tencent-meeting/overview.md)
  - [Webhook 处理](modules/integrations/tencent-meeting/webhook.md)
  - [Webhook 测试](modules/integrations/tencent-meeting/webhook-testing.md)
- **其他基础设施集成**
  - [阿里云短信](modules/integrations/aliyun/sms-setup.md) - Dysmsapi 接入
  - [邮件服务](modules/integrations/email/api.md) - SMTP 队列处理

### 🗺️ 路线图
了解项目未来的架构演进计划：
- [多租户架构](roadmap/multi-tenant-architecture.md)

---

## 👨‍🔧 文档反馈与贡献

当您在开发相关功能且改变了系统固有逻辑时，请务必同步更新对应的文档文件。
保证本文档与对应的源码库版本时效一致。
