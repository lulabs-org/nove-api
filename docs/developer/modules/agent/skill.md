# 技能模块 (Skill Module)

`SkillModule` (`src/skill`) 提供了 AI 智能体与系统的扩展技能管理基础设施。支持通过不可变 Zip 包（Immutable versioning）进行技能的打包导入、解压提取、安全校验、版本切换与生命周期管理。

## 核心设计理念

1. **不可变版本控制 (Immutable Versions)**：
   每个技能可拥有多个版本（SemVer 规范，如 `1.0.0`），版本一旦上传创建，其代码包内容不可变，确保在生产环境和 Agent 调用时的确定性与安全性。
2. **系统技能与租户技能**：
   - **系统技能 (`isSystem: true`)**：平台全局内置的基础技能，各租户只读可用。
   - **自定义技能**：租户/组织内私有技能，支持在所属组织内灵活发布和演进。
3. **Zip 包规范与静态校验**：
   导入时通过 `SkillZipValidator` 对 Zip 文件进行严格的流式校验，必须包含合法的 `manifest.json` 元数据文件。

## Zip 包规范结构

标准技能 Zip 压缩包应具备以下结构：

```text
skill-package.zip
├── manifest.json         # 核心元数据（必需）
├── SKILL.md              # 技能详细说明与 Prompt 指令（推荐）
├── scripts/              # 辅助执行脚本与工具
│   └── handler.py / .ts
└── assets/               # 技能附带的配置或静态资源
```

### `manifest.json` 示例

```json
{
  "name": "sample-data-analyzer",
  "displayName": "数据分析技能",
  "version": "1.0.0",
  "description": "自动化提取并分析会议纪要中的行动项与关键指标",
  "author": "Nove Team",
  "entrypoint": "scripts/handler.ts",
  "tools": [
    {
      "name": "analyze_actions",
      "description": "提取行动项与跟进责任人"
    }
  ]
}
```

## API 端点概览

路由前缀统一为 `/api/v1/skills`，需携带 Bearer 令牌及对应权限码：

| 方法 | 端点 | 权限码 | 说明 |
|---|---|---|---|
| `POST` | `/api/v1/skills/import-zip` | `skill:create` | 上传 Zip 文件导入新技能及首个版本 (`multipart/form-data`) |
| `GET` | `/api/v1/skills` | `skill:read` | 分页查询技能列表，支持名称模糊检索与系统技能过滤 |
| `GET` | `/api/v1/skills/:id` | `skill:read` | 获取单个技能详情（包含版本列表与当前激活版本） |
| `PATCH` | `/api/v1/skills/:id` | `skill:update` | 更新技能基本信息（如显示名称、描述、图标等） |
| `DELETE` | `/api/v1/skills/:id` | `skill:delete` | 删除技能及其关联的所有版本 |
| `POST` | `/api/v1/skills/:id/versions` | `skill:update` | 为已有技能上传并发布新版本 Zip 包 |
| `GET` | `/api/v1/skills/:id/versions/:version/download` | `skill:read` | 下载指定版本的技能 Zip 源码包 |
| `POST` | `/api/v1/skills/:id/versions/:version/activate` | `skill:update` | 将指定版本设置为技能的当前生效（活跃）版本 |
| `DELETE` | `/api/v1/skills/:id/versions/:version` | `skill:delete` | 删除指定版本（活跃版本不允许直接删除） |

## 存储与持久化

- **文件存储**：Zip 原包存储在本地或配置的对象存储 (OSS/S3) 中，下载时通过流式传输（`StreamableFile`）并设置 `Cache-Control: private, no-store`。
- **数据库隔离**：持久化由 `SkillRepository` 负责，基于 Prisma 模型 `skills` 与 `skill_versions` 隔离存储，防止业务逻辑与 ORM 强耦合。
