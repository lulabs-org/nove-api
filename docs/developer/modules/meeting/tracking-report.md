# 追踪报告模块 (Tracking Report Module)

`TrackingReportModule` (`src/tracking-report`) 负责汇总跨周期的会议、任务执行、发言参与度与行动项落地情况，为管理层与团队负责人生成高价值的数字化追踪分析报告。

## 核心能力

1. **多周期聚合分析**：
   - 支持按周、按月或自定义时间范围，聚合组织或项目下的所有会议数据。
2. **行动项与履约跟踪**：
   - 提取各会议中生成的待办事项（Action Items），追踪落实进展、逾期情况与责任人分布。
3. **发言人参与画像**：
   - 结合 `SpeakerSummary` 数据，量化分析核心团队成员的议题参与度、贡献要点与高频讨论方向。

## API 端点概览

路由挂载于 `/tracking-reports`：

| 方法 | 端点 | 权限码 | 说明 |
|---|---|---|---|
| `GET` | `/tracking-reports` | `tracking-report:read` | 分页查询追踪报告历史列表 |
| `GET` | `/tracking-reports/:id` | `tracking-report:read` | 获取单份追踪报告详情及可视化聚合数据 |
| `POST` | `/tracking-reports` | `tracking-report:create` | 创建或手动触发生成新周期的追踪报告 |
| `DELETE` | `/tracking-reports/:id` | `tracking-report:delete` | 删除追踪报告记录 |

## 组织边界

与会议域相同，追踪报告强制绑定 `orgId` 上下文，仅允许检索和生成当前组织所属资源的分析报告。
