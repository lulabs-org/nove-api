# 项目结构

Nove API 按领域组织 NestJS 模块；控制器、服务、仓储、DTO 和测试尽量在同一领域目录内聚。

```text
nove_api/
├── src/
│   ├── admin/                 # 管理后台命名空间（组织、部门、成员、角色、API Key、OAuth Client、服务集成）
│   ├── auth/                  # 用户注册、登录、会话与统一认证守卫
│   ├── oauth/                 # OAuth 2.0 PKCE 授权与令牌分发
│   ├── meeting/               # 会议元数据、录制文件与参会人管理
│   ├── minute/                # 会议纪要、语音转写文本与 AI 总结 (Minute & Speaker Summary)
│   ├── skill/                 # 智能体技能 Zip 包管理与不可变版本控制
│   ├── project/               # 多项目管理与工作区隔离
│   ├── tracking-report/       # 追踪报告生成与履约分析
│   ├── drive/                 # 企业云盘与文件管理
│   ├── mcp-server/            # Model Context Protocol (MCP) Server 端点与工具
│   ├── order/ order-refund/   # 订单、退款与权益
│   ├── product/ channel/      # 商品、SKU 与渠道接入
│   ├── profit-sharing/        # 分账规则、分账记录与伙伴结算单
│   ├── tmeet/                 # 腾讯会议 OpenAPI 与 Webhook (/webhooks/tmeet)
│   ├── lark/                  # 飞书多维表格与事件队列 (/webhooks/lark)
│   ├── wecom/                 # 企业微信 Hermes 通信网关 (/webhooks/wecom/events)
│   ├── wechat-shop/           # 微信小店回调与历史订单同步
│   ├── stripe/                # Stripe 国际信用卡支付
│   ├── mail/ sms/             # SMTP 邮件与阿里云短信
│   ├── storage/ file-scanning/# 本地/OSS 存储适配与 ClamAV/阿里云 SAS 文件扫描
│   ├── common/ configs/       # 通用工具、过滤器、拦截器与全局配置
│   ├── prisma/ task/ redis/   # 数据库、定时任务与 Redis/BullMQ 队列基础设施
│   └── app.module.ts          # 根应用模块装配
├── prisma/
│   ├── schema.prisma          # client generator 与 datasource 声明
│   ├── models/                # 多文件 Prisma Schema 领域模型 (*.prisma)
│   ├── migrations/            # 数据库迁移记录
│   └── seeds/                 # 数据初始化脚本
├── prisma.config.ts           # Prisma 7 根配置文件 (schema, migrations, seed, datasource)
├── test/                      # 单元、集成、系统与 E2E 测试用例
├── docs/                      # VitePress 文档站
│   ├── developer/             # 开发者文档（架构、指南、模块、集成、参考、路线图）
│   ├── user/                  # 用户与 API 使用者文档
│   └── public/                # 文档站静态静态资源
├── scripts/                   # 运维、迁移与回填脚本 (TS/Shell)
└── dist/                      # TypeScript 编译构建产物 (dist/src/main.js)
```

## 领域模块约定

常见领域模块结构如下；只创建实际需要的目录：

```text
feature/
├── controllers/          # 控制器与 Swagger 装饰器
├── services/             # 核心业务逻辑与流程编排
├── repositories/         # Prisma 数据持久化隔离层
├── dto/                  # 请求输入与响应 DTO (class-validator)
├── guards/ decorators/   # 领域专有守卫与参数装饰器
├── types/ enums/         # TypeScript 类型与枚举
└── feature.module.ts     # NestJS 模块装配
```

Controller 负责协议、校验和权限声明；Service 编排业务规则；Repository 封装复杂或可复用的数据访问。

## Prisma 7 与导入

Prisma 采用 **Prisma 7 原生 Schema Folder**：
- 根 `schema.prisma` 仅声明 generator 与 datasource。
- 领域模型文件位于 `prisma/models/*.prisma`（如 `user.prisma`, `meet.prisma`, `order.prisma` 等）。
- 运行时与 CLI 行为统一由根目录 `prisma.config.ts` 管理。
- 修改模型后运行 `pnpm db:generate` 与 `pnpm db:migrate`，无需手动合并模型文件。

源码使用别名 `@/*` 指向 `src/*`，`@common/*` 指向 `src/common/*`。

## 测试位置

- 单元：`src/**/*.spec.ts`、`test/unit/**/*.spec.ts`
- 集成：`test/integration/**/*.int-spec.ts`
- 系统：`test/system/**/*.spec.ts`
- E2E：`test/e2e/**/*.e2e-spec.ts`

## 文档放置

当前事实与未来方案必须分开：`architecture/`、`modules/`、`integrations/` 描述已实现能力，`roadmap/` 保存目标设计。详细规则见[文档维护指南](../guides/collaboration/documentation.md)。
