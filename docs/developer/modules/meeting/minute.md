# 会议纪要与 AI 模块 (Minute Module)

`MinuteModule` (`src/minute`) 是 Nove API 的核心 AI 业务领域，承担会议录制内容的语音转写沉淀、智能章节提取、全局会议纪要总结以及参会发言人（Speaker）维度的结构化分析。

## 领域分层与架构

```text
src/minute/
├── controllers/
│   ├── minute.controller.ts                    # 纪要主记录 CRUD
│   ├── minute-summary.controller.ts            # 全局会议纪要与 AI 总结
│   ├── speaker-summary.controller.ts           # 参会发言人总结与 AI 提取
│   └── platform-user-transcript.controller.ts  # 外部平台用户发言检索
├── services/
│   ├── minute.service.ts
│   ├── minute-summary.service.ts
│   ├── speaker-summary.service.ts              # 封装 Prompt 编排与 LLM 调用
│   └── speaker-summary-crud.service.ts
└── repositories/
    ├── minute.repository.ts
    ├── minute-summary.repository.ts
    └── speaker-summary.repository.ts
```

## 核心功能与流程

1. **转写记录 (Transcripts)**：
   - 记录会议中每个发言片段的时间戳、发言人标识、文本内容。
2. **AI 全文纪要 (Minute Summary)**：
   - 聚合整场会议的转写上下文，调用 LLM 生成结构化会议纪要（包括会议背景、核心决议、讨论要点与待办事项）。
3. **发言人总结 (Speaker Summary)**：
   - 按发言人归类其发言脉络与立场，提炼出个人承诺与关键诉求，支持按参会人员或时间跨度聚合洞察。
4. **外部用户发言检索**：
   - 允许根据外部平台用户（如腾讯会议用户 ID、企微员工号）跨会议检索其历史发言记录与行动项。

## API 端点概览

### 1. 纪要主记录 (`/minutes`)

| 方法 | 端点 | 权限码 | 说明 |
|---|---|---|---|
| `GET` | `/minutes` | `minute:read` | 查询当前组织下的纪要列表 |
| `GET` | `/minutes/:id` | `minute:read` | 获取单个纪要详情 |
| `POST` | `/minutes` | `minute:create` | 创建纪要记录并关联所属会议 |
| `PUT` | `/minutes/:id` | `minute:update` | 更新纪要信息 |
| `DELETE` | `/minutes/:id` | `minute:delete` | 删除纪要记录 |

### 2. 全文总结 (`/minutes/:minuteId/summary`)

| 方法 | 端点 | 权限码 | 说明 |
|---|---|---|---|
| `GET` | `/minutes/:minuteId/summary` | `minute-summary:read` | 获取已生成的会议总结 |
| `POST` | `/minutes/:minuteId/summary` | `minute-summary:create` | 保存或覆盖会议总结内容 |
| `PUT` | `/minutes/:minuteId/summary` | `minute-summary:update` | 更新已有会议总结 |
| `DELETE` | `/minutes/:minuteId/summary` | `minute-summary:delete` | 删除会议总结 |

### 3. 发言人总结 (`/minutes/:minuteId/speaker-summaries`)

| 方法 | 端点 | 权限码 | 说明 |
|---|---|---|---|
| `GET` | `/minutes/:minuteId/speaker-summaries` | `speaker-summary:read` | 分页获取该纪要下的发言人总结列表 |
| `POST` | `/minutes/:minuteId/speaker-summaries` | `speaker-summary:create` | 新增发言人总结条目 |
| `PUT` | `/minutes/:minuteId/speaker-summaries/:id` | `speaker-summary:update` | 更新指定发言人总结 |
| `DELETE` | `/minutes/:minuteId/speaker-summaries/:id` | `speaker-summary:delete` | 删除发言人总结 |
| `POST` | `/minutes/:minuteId/speaker-summaries/generate` | `speaker-summary:create` | **触发 AI 自动生成**参会发言人结构化总结 |

## 组织安全约束

Minute API 继承所属 Meeting 的组织归属校验：
- 当调用 `/minutes/:minuteId/*` 下的任何接口时，系统先断言目标纪要及其所属会议归属于当前请求的 `orgId`。
- 不属于当前组织的访问将统一返回 `404 Not Found`，杜绝跨租户信息探测。
