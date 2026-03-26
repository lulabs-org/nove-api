---
layout: home

hero:
  name: "Nove API"
  text: "企业级会议与用户服务系统"
  tagline: 基于 NestJS · TypeScript · PostgreSQL 构建，提供用户认证、会议管理、第三方服务集成等完整解决方案
  actions:
    - theme: brand
      text: 开发者文档 →
      link: /developer/
    - theme: alt
      text: 用户文档
      link: /user/
    - theme: alt
      text: 快速开始
      link: /developer/architecture/overview

features:
  - icon: 🏗️
    title: 模块化架构
    details: 基于 NestJS 的模块化设计，清晰的模块边界与依赖注入，便于维护和扩展。
  - icon: 🔐
    title: 完善的认证体系
    details: 支持 JWT + Passport 多策略认证，API Key 管理，完整的权限控制体系。
  - icon: 🔌
    title: 丰富的第三方集成
    details: 深度集成腾讯会议、飞书多维表格、阿里云短信、邮件服务与 OpenAI。
  - icon: 🗄️
    title: 类型安全数据访问
    details: 使用 Prisma ORM 提供完全类型安全的数据库访问，自动生成客户端代码。
  - icon: ⚡
    title: 高性能异步处理
    details: BullMQ 任务队列 + Redis 缓存，支持大规模并发和后台异步任务处理。
  - icon: 📊
    title: GraphQL & REST 双协议
    details: 同时提供 RESTful API 和 GraphQL 接口，满足不同客户端的数据需求。
---
