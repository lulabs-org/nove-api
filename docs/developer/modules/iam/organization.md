# 组织、部门与成员

组织域由 `org`、`dept` 和 `org-member` 三个模块组成，管理接口统一位于 `/admin`，并由全局认证和权限守卫保护。

## 成员创建契约

`POST /admin/orgs/:orgId/members` 使用 `CreateOrgMemberDto`：

- `email` 与 `phone` 至少填写一个，不再接收内部 `userId`。
- 传 `phone` 时必须同时传 `countryCode`。
- 邮箱会 trim 并转为小写；手机号会在服务层规范化。
- 可同时指定 `primaryDeptId`、`departmentIds`、`roleIds`、`employeeNo` 和成员资料。
- 已有用户会直接关联；否则创建待验证用户。冲突返回 409。

批量入口 `POST /admin/orgs/:orgId/members/batch` 接收 `{ "members": [...] }`，每一项复用同一 DTO 规则。

## 主要接口与权限

| 能力 | 接口示例 | 权限 |
|---|---|---|
| 成员列表/详情 | `GET /admin/orgs/:orgId/members` | `org-member:read` |
| 新增/批量导入 | `POST .../members[/batch]` | `org-member:create` |
| 更新资料/状态/部门 | `PUT/PATCH /admin/members/:memberId...` | `org-member:update` |
| 移除成员 | `DELETE /admin/members/:memberId` | `org-member:delete` |
| 部门树/列表 | `GET /admin/orgs/:orgId/departments...` | `dept:read` |
| 新增/更新/移动部门 | `POST/PUT/PATCH` | `dept:create` / `dept:update` |

删除成员是软删除。服务会在事务中处理用户匹配/创建、成员恢复以及角色/部门关联，并对唯一键竞态进行一次重试。

## 示例

```json
{
  "email": "student@example.com",
  "orgDisplayName": "示例同学",
  "primaryDeptId": "<department-id>",
  "roleIds": ["<role-id>"]
}
```

具体响应结构和全部查询参数以运行中的 Swagger 为准。
