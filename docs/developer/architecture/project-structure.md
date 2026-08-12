# 项目结构

Nove API 按领域组织 NestJS 模块；控制器、服务、仓储、DTO 和测试尽量在同一领域目录内聚。

```text
nove_api/
├── src/
│   ├── admin/system-config/   # 全局动态配置
│   ├── auth/                  # 登录、注册、令牌与统一认证
│   ├── org/ dept/ org-member/# 组织、部门与成员
│   ├── meeting/ meet-ai/      # 会议数据与 AI 总结
│   ├── integrations/          # 可复用的第三方 SDK/适配层
│   ├── tencent-mtg*/          # 腾讯会议 API 与 Webhook
│   ├── lark-meeting/          # 飞书会议事件与队列
│   ├── wechat-shop/ order/    # 微信小店与订单
│   ├── common/ configs/       # 通用组件与配置
│   ├── prisma/ task/          # 数据访问、定时和异步任务
│   └── app.module.ts          # 根模块装配
├── prisma/
│   ├── schema.prisma          # generator 与 datasource
│   ├── models/                # 多文件 Prisma 模型
│   ├── migrations/            # 已提交迁移
│   └── seeds/ seed-utils/     # 可重复执行的种子数据
├── test/                      # 集成、系统、E2E 与共享夹具
├── docs/                      # VitePress 文档站
│   ├── developer/
│   │   ├── architecture/      # 当前跨模块架构
│   │   ├── guides/            # 开发、数据库、部署指南
│   │   ├── modules/           # Nove 自有模块契约
│   │   ├── integrations/      # 第三方在 Nove 中的实现
│   │   ├── reference/         # 厂商 API 与 Payload 样本
│   │   └── roadmap/           # 未完成或演进中方案
│   ├── user/                  # API 使用者文档
│   └── public/                # 文档站静态资源
├── scripts/                   # 运维、迁移和数据脚本
└── dist/ coverage/            # 生成物，不作为源码编辑
```

## 领域模块约定

常见模块结构如下；只创建实际需要的目录：

```text
feature/
├── controllers/
├── services/
├── repositories/
├── dto/
├── guards/ decorators/
├── types/ enums/
└── feature.module.ts
```

Controller 负责协议、校验和权限声明；Service 编排业务规则；Repository 封装复杂或可复用的数据访问。简单模块不必为了形式强制拆层。

## Prisma 与导入

Prisma 采用 schema folder：根 `schema.prisma` 保存 generator/datasource，领域模型位于 `prisma/models/*.prisma`。修改模型后运行 `pnpm db:generate` 与 `pnpm db:migrate`，不要手工合并模型文件。

源码使用 `@/*` 指向 `src/*`，`@common/*` 指向 `src/common/*`。仓库当前没有根 `libs/` 目录，不要新增 `@libs/*` 引用；共享第三方适配器放在 `src/integrations/`。

## 测试位置

- 单元：`src/**/*.spec.ts`、`test/unit/**/*.spec.ts`
- 集成：`test/integration/**/*.int-spec.ts`
- 系统：`test/system/**/*.spec.ts`
- E2E：`test/e2e/**/*.e2e-spec.ts`

## 文档放置

当前事实与未来方案必须分开：`architecture/`、`modules/`、`integrations/` 描述已实现能力，`reference/` 保存外部资料，`roadmap/` 保存目标设计。详细规则见[文档维护指南](../guides/documentation.md)。
