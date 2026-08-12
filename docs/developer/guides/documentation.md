# 文档维护指南

Nove API 文档采用“当前事实、操作指南、模块契约、集成实现、外部参考、未来规划”分层，避免把愿景或厂商资料误当成当前系统行为。

## 目录职责

```text
docs/
├── developer/
│   ├── architecture/   # 当前系统的整体结构和数据流
│   ├── guides/         # 开发、数据库、部署和文档操作指南
│   ├── modules/        # Nove 自有模块与 API 契约
│   ├── integrations/   # 第三方服务在 Nove 中的实现
│   ├── reference/      # 厂商 API、协议和原始 Payload 样本
│   └── roadmap/        # 尚未完成或仍在演进的方案
├── user/               # 面向 API 使用者的说明
├── public/             # 站点静态资源
└── index.md            # 文档站首页
```

## 放置规则

- 描述当前跨模块结构：放入 `architecture/`。
- 回答“如何开发、测试、部署”：放入 `guides/`。
- 解释 Nove 领域模块、路由或权限：放入 `modules/`。
- 解释 Nove 如何调用第三方：放入 `integrations/`。
- 保存第三方原始接口说明和请求/响应样本：放入 `reference/`。
- 尚未完全实现的设计：放入 `roadmap/`，页面开头标明状态。

不要在多个目录复制同一契约。运行时 DTO、控制器、Prisma schema 和根 `package.json` 是事实来源，文档负责解释和导航。

## 页面与导航

每个一级目录必须有 `index.md`，说明目录边界并链接主要页面。新增、移动或删除页面后同步 `.vitepress/config.mts`。厂商参考资料可以不全部放进主侧栏，但必须从 `reference/index.md` 可发现。

内部 Markdown 链接使用相对路径；运行时 localhost 地址用代码格式，避免被 VitePress 当作构建期死链。不要关闭 `ignoreDeadLinks`。

## 验证

```bash
pnpm docs:dev
pnpm docs:build
git diff --check
```

`pnpm docs:build` 必须在 `ignoreDeadLinks: false` 下通过。若页面描述了构建入口、脚本或生成文件，再运行对应代码命令验证，不只检查文字。
