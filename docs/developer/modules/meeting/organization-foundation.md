# 会议组织归属基础

`Meeting.orgId` 用于记录会议所属组织，为后续按组织隔离会议及其关联资源提供数据基础。

本阶段只增加可空字段、外键、查询索引和历史数据回填工具，不改变现有接口的查询范围。查询隔离将在所有会议写入入口都能正确传递组织上下文后启用。

## 部署与历史数据

先应用数据库迁移，再执行只读预检：

```bash
pnpm db:backfill:meeting-org
```

确认输出的组织 ID 和待处理数量后再写入：

```bash
pnpm db:backfill:meeting-org -- --apply
```

存在多个启用组织时，脚本不会猜测历史会议归属，必须显式指定目标组织：

```bash
pnpm db:backfill:meeting-org -- --org-id <organization-id> --apply
```

脚本只更新 `org_id IS NULL` 的会议，包括已软删除记录。执行完成后，输出中的 `remaining` 必须为 `0`。

在后续组织隔离 PR 合并前，应再次运行预检并补齐迁移后新增的未归属会议。
