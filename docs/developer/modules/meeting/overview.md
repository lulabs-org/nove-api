# 会议模块 (Meeting Module)

`MeetingModule` (`src/meeting`) 负责管理多平台会议的核心生命周期与元数据。系统支持自建会议以及来自腾讯会议 (TMeet)、飞书 (Lark) 等第三方平台的会议事件同步。

## 核心职责

1. **会议生命周期**：
   - 管理会议的基本属性（主题、时间、主持人、参会人数、平台会议 ID、状态等）。
   - 维护会议与录制文件（Recording Files）、参与者（Participants）的关系。
2. **多租户与组织隔离**：
   - 每个会议必须关联明确的 `orgId`。
   - 跨组织访问直接返回 404/403，详情见[会议组织归属基础](./organization-foundation.md)。
3. **平台映射与去重**：
   - 根据 `(platform, platformMeetingId)` 建立唯一业务索引，支持同一场会议在开始、结束、录制完成等多阶段的幂等更新。

## API 端点概览

路由挂载于 `/meetings`：

| 方法 | 端点 | 权限码 | 说明 |
|---|---|---|---|
| `GET` | `/meetings` | `meeting:read` | 分页查询会议记录列表，支持按平台、时间范围、关键字过滤 |
| `GET` | `/meetings/:id` | `meeting:read` | 获取单个会议详情及关联的录制文件、参会者列表 |
| `POST` | `/meetings` | `meeting:create` | 创建本地或平台映射会议 |
| `PUT` | `/meetings/:id` | `meeting:update` | 更新会议基础信息与状态 |
| `DELETE` | `/meetings/:id` | `meeting:delete` | 删除会议记录（软删除） |
| `GET` | `/meetings/:id/participants` | `meeting:read` | 获取指定会议的参会人名单与时长统计 |

## 会议与纪要 (Minute) 的边界

- **`Meeting`**：聚焦于“客观发生的会议实体”，关注参会人、时间、录制音视频文件。
- **`Minute`**：聚焦于“会议产生的内容与洞察”，关注语音转写文本、AI 智能总结、待办抽取和发言人分析。两者通过 `meetingId` 关联。
