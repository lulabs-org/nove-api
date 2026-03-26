# 项目结构文档

本文档详细描述了 Nove API 系统的项目结构，包括目录组织、模块划分和开发流程。

## 目录结构概览

```
lulab_backend/
├── src/                           # 源代码目录
│   ├── auth/                      # 认证模块
│   │   ├── controllers/           # 控制器
│   │   ├── services/              # 业务逻辑服务
│   │   ├── repositories/          # 数据访问层
│   │   ├── dto/                   # 数据传输对象
│   │   ├── enums/                 # 枚举定义
│   │   ├── types/                 # 类型定义
│   │   ├── guards/                # 守卫
│   │   ├── strategies/            # 策略
│   │   └── decorators/            # 装饰器
│   ├── meeting/                   # 会议模块
│   ├── hook-tencent-mtg/           # 腾讯会议集成
│   ├── integrations/               # 第三方集成
│   │   ├── lark/                  # 飞书集成
│   │   ├── tencent-meeting/       # 腾讯会议API
│   │   ├── aliyun/                # 阿里云服务
│   │   ├── email/                 # 邮件服务
│   │   └── openai/                # OpenAI集成
│   ├── lark-meeting/              # 飞书会议模块
│   ├── user/                      # 用户模块
│   ├── verification/              # 验证码模块
│   ├── mail/                      # 邮件模块
│   ├── task/                      # 任务模块
│   ├── common/                    # 公共模块
│   ├── configs/                   # 配置模块
│   ├── prisma/                    # 数据库模块
│   └── redis/                     # 缓存模块
├── prisma/                        # 数据库相关
│   ├── models/                    # 数据模型定义
│   ├── seeds/                     # 种子数据
│   ├── migrations/                # 数据库迁移
│   └── schema.prisma              # Prisma主模式文件
├── docs/                          # 文档目录
│   ├── getting-started/           # 入门文档
│   ├── infrastructure/            # 基础设施文档
│   └── reference/                 # 参考文档
├── scripts/                       # 脚本目录
└── test/                          # 测试目录
```

## 核心目录详解

### src/ - 源代码目录

源代码目录包含所有应用程序的核心逻辑，按照功能模块进行组织。

#### auth/ - 认证模块

负责用户认证、授权和权限管理。

```
auth/
├── controllers/                   # HTTP请求处理
│   ├── auth.controller.ts         # 认证控制器
│   └── verification.controller.ts  # 验证码控制器
├── services/                      # 业务逻辑
│   ├── login.service.ts           # 登录服务
│   ├── register.service.ts        # 注册服务
│   ├── token.service.ts           # 令牌管理服务
│   └── password-reset.service.ts  # 密码重置服务
├── repositories/                  # 数据访问层
│   ├── user.repository.ts         # 用户数据访问
│   └── auth.repository.ts         # 认证相关数据访问
├── dto/                           # 数据传输对象
│   ├── login.dto.ts               # 登录DTO
│   ├── register.dto.ts            # 注册DTO
│   └── password-reset.dto.ts      # 密码重置DTO
├── enums/                         # 枚举定义
│   ├── auth-provider.enum.ts      # 认证提供者
│   └── token-type.enum.ts         # 令牌类型
├── types/                         # 类型定义
│   ├── auth.types.ts              # 认证相关类型
│   └── user.types.ts              # 用户相关类型
├── guards/                        # 守卫
│   ├── auth.guard.ts              # 认证守卫
│   └── permission.guard.ts        # 权限守卫
├── strategies/                    # 策略
│   ├── jwt.strategy.ts            # JWT策略
│   └── local.strategy.ts          # 本地认证策略
└── decorators/                    # 装饰器
    ├── current-user.decorator.ts  # 当前用户装饰器
    └── public.decorator.ts        # 公共路由装饰器
```

#### meeting/ - 会议模块

负责会议管理、会议记录处理和相关功能。

```
meeting/
├── controllers/
│   ├── meeting.controller.ts      # 会议控制器
│   ├── recording.controller.ts    # 录制控制器
│   └── summary.controller.ts      # 会议总结控制器
├── services/
│   ├── meeting.service.ts         # 会议服务
│   ├── recording.service.ts       # 录制服务
│   ├── summary.service.ts         # 总结服务
│   └── transcription.service.ts   # 转写服务
├── repositories/
│   ├── meeting.repository.ts      # 会议数据访问
│   ├── recording.repository.ts    # 录制数据访问
│   └── summary.repository.ts      # 总结数据访问
├── dto/
│   ├── create-meeting.dto.ts      # 创建会议DTO
│   ├── update-meeting.dto.ts      # 更新会议DTO
│   └── meeting-query.dto.ts       # 会议查询DTO
├── enums/
│   ├── meeting-type.enum.ts       # 会议类型
│   ├── meeting-status.enum.ts     # 会议状态
│   └── recording-status.enum.ts   # 录制状态
└── types/
    ├── meeting.types.ts           # 会议相关类型
    └── recording.types.ts         # 录制相关类型
```

#### integrations/ - 第三方集成

负责与外部系统的集成，包括各种API调用和webhook处理。

```
integrations/
├── lark/                          # 飞书集成
│   ├── controllers/
│   │   ├── webhook.controller.ts   # Webhook控制器
│   │   └── bitable.controller.ts   # 多维表格控制器
│   ├── services/
│   │   ├── webhook.service.ts      # Webhook服务
│   │   ├── bitable.service.ts      # 多维表格服务
│   │   └── auth.service.ts         # 飞书认证服务
│   └── types/
│       ├── webhook.types.ts        # Webhook类型
│       └── bitable.types.ts        # 多维表格类型
├── tencent-meeting/               # 腾讯会议API
│   ├── services/
│   │   ├── api.service.ts         # API服务
│   │   ├── webhook.service.ts     # Webhook服务
│   │   └── auth.service.ts        # 认证服务
│   └── types/
│       ├── meeting.types.ts       # 会议类型
│       └── webhook.types.ts       # Webhook类型
├── aliyun/                        # 阿里云服务
│   ├── services/
│   │   ├── sms.service.ts         # 短信服务
│   │   └── oss.service.ts         # 对象存储服务
│   └── types/
│       └── aliyun.types.ts        # 阿里云相关类型
├── email/                         # 邮件服务
│   ├── services/
│   │   ├── smtp.service.ts        # SMTP服务
│   │   └── template.service.ts    # 邮件模板服务
│   └── types/
│       └── email.types.ts         # 邮件相关类型
└── openai/                        # OpenAI集成
    ├── services/
    │   ├── chat.service.ts        # 聊天服务
    │   └── transcription.service.ts # 转写服务
    └── types/
        └── openai.types.ts        # OpenAI相关类型
```

#### common/ - 公共模块

包含跨模块共享的组件、工具和功能。

```
common/
├── decorators/                    # 装饰器
│   ├── pagination.decorator.ts    # 分页装饰器
│   ├── cache.decorator.ts         # 缓存装饰器
│   └── rate-limit.decorator.ts    # 限流装饰器
├── filters/                       # 异常过滤器
│   ├── http-exception.filter.ts   # HTTP异常过滤器
│   └── validation.filter.ts       # 验证异常过滤器
├── interceptors/                  # 拦截器
│   ├── logging.interceptor.ts     # 日志拦截器
│   ├── cache.interceptor.ts       # 缓存拦截器
│   └── transform.interceptor.ts   # 转换拦截器
├── pipes/                         # 管道
│   ├── validation.pipe.ts         # 验证管道
│   └── parse-uuid.pipe.ts        # UUID解析管道
├── utils/                         # 工具函数
│   ├── crypto.util.ts             # 加密工具
│   ├── date.util.ts               # 日期工具
│   └── string.util.ts             # 字符串工具
├── constants/                     # 常量
│   ├── error.constants.ts         # 错误常量
│   └── app.constants.ts           # 应用常量
└── types/                         # 通用类型
    ├── common.types.ts            # 通用类型
    └── pagination.types.ts        # 分页类型
```

### prisma/ - 数据库相关

包含数据库模式定义、迁移文件和种子数据。

```
prisma/
├── models/                        # 数据模型定义
│   ├── user.model.ts              # 用户模型
│   ├── meeting.model.ts           # 会议模型
│   └── organization.model.ts      # 组织模型
├── seeds/                         # 种子数据
│   ├── users.seed.ts              # 用户种子数据
│   ├── permissions.seed.ts        # 权限种子数据
│   └── organizations.seed.ts      # 组织种子数据
├── migrations/                    # 数据库迁移
│   ├── 001_init_schema.sql        # 初始化模式
│   ├── 002_add_meeting_tables.sql # 添加会议表
│   └── 003_add_integrations.sql   # 添加集成表
└── schema.prisma                  # Prisma主模式文件
```

### docs/ - 文档目录

包含项目文档、API文档和开发指南。

```
docs/
├── getting-started/               # 入门文档
│   ├── installation.md           # 安装指南
│   ├── configuration.md          # 配置指南
│   └── quick-start.md            # 快速开始
├── infrastructure/                # 基础设施文档
│   ├── deployment.md             # 部署指南
│   ├── monitoring.md             # 监控指南
│   └── backup.md                 # 备份指南
├── reference/                    # 参考文档
│   ├── api.md                    # API参考
│   ├── cli.md                    # CLI参考
│   └── configuration.md          # 配置参考
└── architecture/                 # 架构文档
    ├── TECH-STACK.md             # 技术栈
    ├── MODULES.md                # 模块架构
    ├── DATA-FLOW.md              # 数据流
    ├── DATABASE.md               # 数据库设计
    ├── DEPLOYMENT.md             # 部署架构
    └── PROJECT-STRUCTURE.md      # 项目结构
```

## 模块间关系

### 依赖关系图

```mermaid
graph TB
    subgraph 应用层[应用层]
        Auth[Auth Module]
        Meeting[Meeting Module]
        User[User Module]
    end

    subgraph 集成层[集成层]
        Tencent[Tencent Meeting]
        Lark[Lark Integration]
        Aliyun[Aliyun Services]
    end

    subgraph 基础设施层[基础设施层]
        Common[Common Module]
        Prisma[Prisma Database]
        Redis[Redis Cache]
    end

    Auth --> Tencent
    Auth --> Lark
    Meeting --> Tencent
    Meeting --> Lark
    User --> Lark
    User --> Aliyun

    Tencent --> Common
    Lark --> Common
    Aliyun --> Common

    Auth --> Prisma
    Meeting --> Prisma
    User --> Prisma

    Auth --> Redis
    Meeting --> Redis
    User --> Redis
```

### 模块通信模式

1. **同步通信**: 通过依赖注入直接调用服务方法
2. **异步通信**: 通过事件发布/订阅模式
3. **外部通信**: 通过HTTP API或消息队列

## 命名约定

### 文件和目录命名

- **目录**: 使用 kebab-case (小写字母和连字符)
  - 示例: `user-management/`, `auth-service/`
- **文件**: 使用 kebab-case
  - 示例: `user.service.ts`, `auth.controller.ts`

### 代码命名

- **类名**: 使用 PascalCase (大驼峰)
  - 示例: `UserService`, `AuthController`
- **方法和变量**: 使用 camelCase (小驼峰)
  - 示例: `getUserById()`, `userName`
- **常量**: 使用 UPPER_SNAKE_CASE
  - 示例: `MAX_RETRY_COUNT`, `API_BASE_URL`
- **接口**: 使用 PascalCase，可选 `I` 前缀
  - 示例: `IUserRepository`, `UserService`

### 数据库命名

- **表名**: 使用 snake_case (小写字母和下划线)
  - 示例: `users`, `meeting_records`
- **字段名**: 使用 snake_case
  - 示例: `user_id`, `created_at`
- **索引名**: 使用描述性名称
  - 示例: `idx_users_email`, `idx_meetings_start_at`

## 最佳实践

### 代码组织

1. **单一职责原则**: 每个模块、类和方法只负责一个功能
2. **依赖注入**: 使用 NestJS 的依赖注入系统管理依赖
3. **接口隔离**: 定义小而专一的接口
4. **错误处理**: 使用统一的错误处理机制

### 性能优化

1. **数据库查询优化**: 使用适当的索引和查询优化
2. **缓存策略**: 合理使用缓存减少数据库访问
3. **异步处理**: 使用消息队列处理长时间运行的任务
4. **连接池**: 配置适当的数据库连接池大小

### 安全考虑

1. **输入验证**: 使用 DTO 验证所有输入数据
2. **认证和授权**: 实现适当的认证和授权机制
3. **敏感数据**: 加密存储敏感信息
4. **日志安全**: 避免在日志中记录敏感信息

### 测试策略

1. **单元测试**: 测试单个函数和方法的逻辑
2. **集成测试**: 测试模块间的交互
3. **端到端测试**: 测试完整的用户流程
4. **测试覆盖率**: 保持高测试覆盖率