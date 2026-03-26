# 模块设计文档

本文档详细描述了 Nove API 系统 的模块划分和设计，包括核心业务模块、集成模块和基础设施模块。

## 模块架构概览

本系统采用模块化架构设计，每个模块遵循单一职责原则，通过依赖注入实现松耦合。模块分为核心业务模块、集成模块和基础设施模块三类。

## 核心业务模块

### 1. 认证模块 (Auth Module)

**目录结构**: `src/auth/`

**职责**: 用户身份验证、授权管理和令牌处理

**核心组件**:
- **控制器层**:
  - `AuthController`: 认证相关 API 端点
- **服务层**:
  - `RegisterService`: 用户注册流程（验证码校验、用户创建、欢迎邮件）
  - `LoginService`: 用户登录流程（密码/验证码、限流、登录日志）
  - `PasswordService`: 密码重置（验证码校验、密码强度校验、通知邮件）
  - `ProfileService`: 用户资料管理（获取/更新、唯一性校验）
  - `TokenService`: JWT 令牌签发、刷新和验证
  - `TokenBlacklistService`: 令牌撤销（黑名单，基于 jti）
  - `AuthPolicyService`: 登录策略（失败次数限制、登录日志、类型映射）
  - `JwtUserLookupService`: 用户查找和缓存服务
- **仓储层**:
  - `UserRepository`: 用户与档案读写
  - `LoginLogRepository`: 登录日志统计与写入
  - `RefreshTokenRepository`: 刷新令牌管理
- **安全层**:
  - `JwtAuthGuard`: JWT 认证守卫
  - `JwtStrategy`: JWT 认证策略
- **装饰器**:
  - `@Public`: 标记公开接口
  - `@User`: 提取用户信息
  - `@ApiDocs`: API 文档装饰器

### 2. 会议模块 (Meeting Module)

**目录结构**: `src/meeting/`

**职责**: 会议记录管理、会议数据分析和会议统计

**核心组件**:
- **控制器层**:
  - `MeetingController`: 会议管理 API 接口
- **服务层**:
  - `MeetingService`: 会议记录管理业务逻辑
  - `MeetingStatisticsService`: 会议数据统计服务
- **仓储层**:
  - `MeetingRepository`: 会议数据访问层
- **工具类**:
  - `TextAnalysisUtil`: 会议文本分析工具
- **其他**:
  - 装饰器: 会议记录相关装饰器
  - DTO: 会议记录数据传输对象
  - 类型定义: 会议相关类型定义

### 3. 用户模块 (User Module)

**目录结构**: `src/user/`

**职责**: 用户信息管理、用户档案维护和权限控制

**核心组件**:
- **控制器层**:
  - `UserController`: 用户管理 API 接口
- **服务层**:
  - `UserService`: 用户信息管理业务逻辑
  - `ProfileService`: 用户档案管理
- **仓储层**:
  - `UserRepository`: 用户数据访问层
- **功能**: 用户档案管理、权限控制

### 4. 验证码模块 (Verification Module)

**目录结构**: `src/verification/`

**职责**: 验证码生成、发送和验证

**核心组件**:
- **控制器层**:
  - `VerificationController`: 验证码 API 接口
- **服务层**:
  - `VerificationService`: 验证码生成、发送和验证
- **仓储层**:
  - `VerificationRepository`: 验证码数据管理
- **功能**: 邮件和短信验证码多渠道支持

## 集成模块

### 1. 腾讯会议集成模块 (Tencent Meeting Module)

**目录结构**: `src/hook-tencent-mtg/`

**职责**: 腾讯会议 Webhook 事件处理和 API 调用

**核心组件**:
- **控制器层**:
  - `TencentWebhookController`: Webhook 事件接收
  - `TencentMeetingController`: 管理接口
- **服务层**:
  - `TencentEventHandlerService`: Webhook 事件分发
  - `TencentApiService`: 腾讯会议开放 API 调用
  - `TencentMeetingConfigService`: 配置管理
- **事件处理器**:
  - `MeetingStartedHandler`: 会议开始事件
  - `MeetingEndedHandler`: 会议结束事件
  - `RecordingCompletedHandler`: 录制完成事件
  - `MeetingParticipantJoinedHandler`: 参与者加入事件
- **工具类**:
  - 加密工具: 签名验证和 AES 解密
  - 类型定义: 会议、录制、参会者等 API 响应类型
  - 异常处理: 腾讯会议 API 相关异常

### 2. 飞书会议模块 (Lark Meeting Module)

**目录结构**: `src/lark-meeting/`

**职责**: 飞书 Webhook 事件处理和会议业务逻辑

**核心组件**:
- **控制器层**:
  - `LarkWebhookController`: 飞书 Webhook 事件接收
- **服务层**:
  - `LarkWebhookService`: 飞书事件处理服务
  - `LarkMeetingService`: 飞书会议业务逻辑
  - `LarkEventWsService`: WebSocket 事件服务
  - `LarkEventProcessor`: 事件队列处理器
- **适配器**:
  - `LarkEventAdapter`: 事件适配器
  - `PickRequestData`: 请求数据提取器
- **兼容性支持**: 保留旧的 `/webhooks/feishu` 路由别名

### 3. 集成服务模块 (Integration Services)

**目录结构**: `src/integrations/`

**职责**: 第三方服务集成和 API 调用

**子模块**:
- **飞书集成 (Lark Integration)**:
  - `LarkClient`: 飞书 SDK 封装和 API 调用
  - `BitableService`: 多维表格操作服务
  - `MeetingRecordingService`: 会议录制处理服务
  - `Repositories`: 会议、用户、录制文件、数字记录管理
  - 类型定义: MeetingData, MeetingUserData, RecordingFileData 等
  - 异常处理: Lark 相关异常类
  - 数据验证: FieldValidator 字段验证器

- **腾讯会议集成 (Tencent Meeting Integration)**:
  - `TencentApiService`: 腾讯会议开放 API 调用
  - 加密工具: 签名验证和 AES 解密
  - 类型定义: 会议、录制、参会者等 API 响应类型
  - 异常处理: 腾讯会议 API 相关异常

- **其他集成服务**:
  - 阿里云短信 (Aliyun SMS): 短信发送服务
  - 邮件服务 (Email Service): SMTP 邮件发送服务
  - OpenAI 集成: AI 功能支持

### 4. 邮件模块 (Email Module)

**目录结构**: `src/mail/`

**职责**: 邮件发送和模板管理

**核心组件**:
- **控制器层**:
  - `EmailController`: 邮件发送 API 接口
- **服务层**:
  - `EmailService`: 邮件发送业务逻辑
- **处理器**:
  - `MailProcessor`: 邮件队列处理器
- **模板管理**: 邮件模板系统
- **装饰器**: 邮件相关装饰器

### 5. 任务模块 (Task Module)

**目录结构**: `src/task/`

**职责**: 任务管理和调度

**核心组件**:
- **控制器层**:
  - `TaskController`: 任务管理 API 接口
- **服务层**:
  - `TaskService`: 任务业务逻辑
- **处理器**:
  - `TaskProcessor`: 任务队列处理器
- **功能**: 定时任务、一次性任务管理

## 基础设施模块

### 1. 安全模块 (Security Module)

**目录结构**: `src/auth/guards/`, `src/auth/strategies/`

**职责**: 系统安全相关功能

**核心组件**:
- **JWT 守卫**: `JwtAuthGuard`，提供路由级别的身份验证
- **装饰器**: `@Public` 装饰器，用于标记公开接口
- **类型定义**: 安全相关类型和接口

### 2. 公共模块 (Common Module)

**目录结构**: `src/common/`

**职责**: 公共工具和共享组件

**核心组件**:
- **工具类**: 随机数生成、验证器、HTTP 文件处理
- **枚举类型**: 公共枚举定义
- **邮件模板**: 邮件模板系统

### 3. 数据库模块 (Database Module)

**目录结构**: `src/prisma/`

**职责**: 数据库连接和操作

**核心组件**:
- `PrismaService`: Prisma 客户端管理
- `PrismaModule`: 数据库模块配置
- **数据库连接**: PostgreSQL 连接管理

### 4. 缓存模块 (Cache Module)

**目录结构**: `src/redis/`

**职责**: 缓存管理和会话存储

**核心组件**:
- `RedisService`: Redis 客户端管理
- `RedisModule`: 缓存模块配置
- **缓存策略**: 数据缓存、会话存储

### 5. 配置模块 (Config Module)

**目录结构**: `src/configs/`

**职责**: 系统配置管理

**核心组件**:
- 各种配置服务: JWT、数据库、第三方服务等配置
- 环境变量管理
- 配置验证