# 模块设计文档

本文档详细描述了 Nove API 系统的模块划分和设计，包括核心业务模块、集成模块和基础设施模块。

## 模块架构概览

本系统采用模块化架构设计，每个模块遵循单一职责原则，通过依赖注入实现松耦合。模块分为核心业务、权限与组织架构、电商与订单、集成模块和基础设施模块五大类。

## 核心业务模块

### 1. 认证模块 (Auth Module)
**目录结构**: `src/auth/`
**职责**: 用户身份验证、授权管理和令牌处理
**核心组件**: AuthController, Register/Login/PasswordService, TokenService 等。基于 JWT 实现。

### 2. 会议模块 (Meeting Module)
**目录结构**: `src/meeting/`
**职责**: 会议记录管理、会议数据分析和会议统计
**核心组件**: MeetingController, MeetingService, MeetingStatisticsService。负责会议信息的 CRUD 与核心展现。

### 3. 会议智能与处理 (Meet AI Module)
**目录结构**: `src/meet-ai/`
**职责**: 结合大模型对会议内容进行提取、分析和总结。

### 4. 用户基础模块 (User & User Platform)
**目录结构**: `src/user/`, `src/user-platform/`
**职责**: 用户档案管理、多平台（如飞书、微信）账号绑定。
**核心组件**: UserController, PlatformUserController, ProfileService。

### 5. API Key 管理 (API Key Module)
**目录结构**: `src/api-key/`
**职责**: 开发者或第三方应用访问本系统 API 的凭证管理。

## 权限与组织架构模块

本系统实现了灵活的多租户和企业级权限管控 (RBAC)。

### 1. 组织与部门 (Org, Dept, Org Member)
**目录结构**: `src/org/`, `src/dept/`, `src/org-member/`
**职责**: 企业租户 (Organization) 管理，部门树形结构维护，以及组织成员的生命周期管理。

### 2. 角色与权限 (Role & Permission)
**目录结构**: `src/role/`, `src/permission/`
**职责**: 细粒度的权限点定义（支持树形层级结构）与角色绑定。基于 `permission.guard.ts` 和 `@Permissions()` 装饰器进行路由拦截。

## 电商与订单模块

### 1. 订单管理 (Order Module)
**目录结构**: `src/order/`
**职责**: 系统内部的商品购买订单生命周期管理与退款逻辑。

### 2. 微信小店集成 (Wechat Shop Module)
**目录结构**: `src/wechat-shop/`
**职责**: 对接微信视频号/微信小店 API，拉取订单事件并同步到系统内。

## 集成模块

### 1. 腾讯会议 (Tencent Meeting)
**目录结构**: `src/tencent-mtg/`, `src/tencent-mtg-hook/`
**职责**: 腾讯会议 OpenAPI 的调用与 Webhook 事件（录制完成、参会人进出、结束等）的异步处理。

### 2. 飞书会议 (Lark Meeting & Integrations)
**目录结构**: `src/lark-meeting/`, `src/integrations/lark/`
**职责**: 飞书 Webhook 事件接收，以及将系统内产生的会议纪要、录制记录同步推送至飞书多维表格 (Bitable)。

### 3. MCP 服务器 (MCP Server)
**目录结构**: `src/mcp-server/`
**职责**: 提供 Model Context Protocol (MCP) 接口，允许外部大语言模型客户端直接通过标准协议查询或操作系统内部资源。

### 4. 邮件与短信 (Mail & Verification)
**目录结构**: `src/mail/`, `src/verification/`
**职责**: SMTP 邮件发送（包含带鉴权的延时发送）、阿里云短信发送，以及验证码的生成与校验。

## 基础设施模块

### 1. 任务调度 (Task Module)
**目录结构**: `src/task/`
**职责**: 系统定时任务 (Cron) 与后台异步任务执行管理，确保长耗时操作不阻塞 HTTP 请求。

### 2. Webhook 日志 (Webhook Log Module)
**目录结构**: `src/webhook-log/`
**职责**: 记录所有外部服务（腾讯会议、飞书、微信小店）回调本系统的原始 Payload 和处理状态，方便排障与重试。

### 3. 数据库与缓存 (Prisma & Redis)
**目录结构**: `src/prisma/`, `src/redis/`
**职责**: PostgreSQL 的 Prisma ORM 客户端实例化与生命周期管理，Redis 客户端封装与缓存辅助。

### 4. 通用与配置 (Common & Configs)
**目录结构**: `src/common/`, `src/configs/`
**职责**: 系统级异常过滤器、响应拦截器、加密工具、全局环境变量注册。