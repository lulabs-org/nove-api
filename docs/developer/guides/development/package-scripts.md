# Package 脚本

以下命令与根 `package.json` 保持一致。统一使用 pnpm，并在仓库根目录执行。

## 构建与运行

| 命令 | 作用 |
|---|---|
| `pnpm build` | 使用 Nest CLI 编译到 `dist/` |
| `pnpm start` | 直接运行 Nest 应用 |
| `pnpm start:dev` | watch 模式开发运行 |
| `pnpm start:debug` | 开启调试器并 watch |
| `pnpm start:prod` | 当前配置为运行 `dist/main`；与实际 `dist/src/main.js` 产物存在偏差，部署暂用 Docker 或直接运行真实入口 |

## 质量与测试

| 命令 | 作用 |
|---|---|
| `pnpm format` | Prettier 写入 `src`、`test`、`prisma` 下的 TypeScript |
| `pnpm lint` | ESLint 检查并修复应用和测试代码 |
| `pnpm lint:prisma` | 检查 Prisma 种子等 TypeScript |
| `pnpm test` / `pnpm test:watch` | 运行 Jest 或 watch |
| `pnpm test:unit` | 运行 unit project；全局覆盖率阈值为 80% |
| `pnpm test:integration` | 运行 `test/integration/**/*.int-spec.ts` |
| `pnpm test:system` | 运行 `test/system/**/*.spec.ts` |
| `pnpm test:e2e` | 运行 `test/e2e/**/*.e2e-spec.ts` |
| `pnpm test:all` | 顺序选择全部四类 Jest project |
| `pnpm test:ci` | 全套测试并生成覆盖率 |

`lint` 和 `format` 当前均会写文件；CI 如需纯检查，应使用工具自身的 check 参数并先确认脚本透传行为。

## Prisma

| 命令 | 作用 |
|---|---|
| `pnpm db:generate` | 从 `prisma/` schema folder 生成 Client |
| `pnpm db:push` | 开发期直接同步 schema，不创建迁移 |
| `pnpm db:migrate` | 创建并应用开发迁移 |
| `pnpm db:migrate:status` | 查看迁移状态 |
| `pnpm db:migrate:prod` | 在部署环境执行已有迁移 |
| `pnpm db:studio` | 启动 Prisma Studio |
| `pnpm db:reset` | 删除数据并重放迁移，属于破坏性操作 |
| `pnpm db:seed` / `pnpm db:seed:real` | 写入默认或 `--real` 种子数据 |
| `pnpm db:backup` | 执行 `scripts/shell/backup.sh` |

旧文档中的 `db:cleandata`、`db:drop*`、`db:seed:reset*` 已不在 `package.json`，不要继续使用。

## MCP 与文档

- `pnpm mcp:inspect`：脚本当前指向不存在的 `dist/main.js`；构建产物实际为 `dist/src/main.js`，修正脚本前请直接配置 Inspector。
- `pnpm mcp:inspect:dev`：由 Inspector 启动 Nest。
- `pnpm mcp:inspect:sse`：连接 `http://localhost:3000/sse`。
- `pnpm mcp:inspect:http`：连接 `http://localhost:3000/mcp`。
- `pnpm docs:dev`：启动 VitePress。
- `pnpm docs:build`：严格构建文档站；提交文档前必须通过。

## 推荐门禁

常规代码变更至少运行：

```bash
pnpm lint
pnpm lint:prisma
pnpm build
pnpm test:unit
pnpm docs:build # 修改文档或导航时
```

涉及数据库时再运行 `pnpm db:generate`、`pnpm prisma validate` 以及目标迁移/测试。CI 当前使用 Node 20、pnpm 9、PostgreSQL 15 和 Redis 7。
