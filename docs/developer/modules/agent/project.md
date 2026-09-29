# 项目管理模块 (Project Module)

`ProjectModule` (`src/project`) 负责组织内部的多项目/工作区划分，使同一个组织内部的团队、业务单元能够按项目隔离数据资源（如会议、纪要、商品、任务等）。

## 核心设计与数据模型

1. **组织与项目关系**：
   - 项目必须归属于一个明确的组织 (`orgId`)。
   - 同一组织下项目名称与标识符（`slug`）具备唯一性约束。
2. **Slug 自动生成**：
   - 创建项目时若未显式指定 `slug`，系统将基于项目名称、拼音或时间戳自动生成规范的 `slug`，保证 URL 友好且不重复。
3. **成员与角色归属**：
   - 项目支持独立关联所有者（`ownerUserId`）与成员列表，与组织的全局 RBAC 权限联动。
4. **生命周期与状态**：
   - 支持项目状态流转（如 `ACTIVE`、`ARCHIVED`、`DISABLED`），归档项目默认不出现在日常操作选择器中。

## API 端点概览

路由挂载于管理后台前缀 `/admin/projects`，要求具备 `project:*` 权限：

| 方法 | 端点 | 权限码 | 说明 |
|---|---|---|---|
| `POST` | `/admin/projects` | `project:create` | 创建新项目（支持自动生成 slug 与绑定初始负责人） |
| `GET` | `/admin/projects` | `project:read` | 分页查询项目列表，支持关键字搜索与状态过滤 |
| `GET` | `/admin/projects/:id` | `project:read` | 获取单个项目详情 |
| `PUT` | `/admin/projects/:id` | `project:update` | 完整更新项目信息 |
| `PATCH` | `/admin/projects/:id` | `project:update` | 部分更新项目字段 |
| `PATCH` | `/admin/projects/:id/status` | `project:update` | 更新项目状态（如激活、归档、禁用） |
| `DELETE` | `/admin/projects/:id` | `project:delete` | 删除或软删除项目 |
| `GET` | `/admin/projects/:id/owners` | `project:read` | 查询项目负责人候选列表 |

## 数据隔离与多租户集成

在处理涉及特定项目的业务请求（如获取属于该项目的会议纪要或统计报表）时，服务层自动将请求上下文中的 `orgId` 与 `projectId` 注入数据库查询条件，确保跨租户与跨项目的严格数据隔离。
