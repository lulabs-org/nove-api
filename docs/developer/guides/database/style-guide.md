# 数据库 & Prisma 设计规范（Enhanced Edition）

适用于 **PostgreSQL + Prisma**  
目标：**一致性 / 可维护性 / 可演进性 / 可审计性**

---

## 0. 设计总目标

- **数据库是长期资产**，Prisma 只是访问层
- 命名 ≠ 实现细节，而是 **领域模型的稳定接口**
- 规范优先级：  
  **数据安全 > 可读性 > 扩展性 > 开发便利**

---

## 1. 分层命名原则（强制）

| 层级 | 命名风格 | 示例 |
|---|---|---|
| 数据库表 | `snake_case` + 复数 | `meeting_participants` |
| 数据库列 | `snake_case` | `host_user_id` |
| Prisma Model | `PascalCase` + 单数 | `MeetingParticipant` |
| Prisma 字段 | `camelCase` | `hostUserId` |
| TypeScript | `camelCase` | `meeting.hostUserId` |

**强制要求**
- Prisma **必须** 使用 `@map / @@map`
- Prisma schema **不得出现 snake_case 字段**

---

## 2. Prisma Model 规范

### 2.1 Model 命名

- 单数
- PascalCase
- 不使用缩写、不携带技术细节

```prisma
model Meeting {}
model RecordingFile {}
model TranscriptSegment {}
```

禁止：
```prisma
model meetings {}
model rec_file {}
```

---

### 2.2 表名映射（必须）

```prisma
model Meeting {
  @@map("meetings")
}
```

原因：
- Prisma 默认命名策略可能变化
- 明确数据库真实结构
- 便于 SQL / DBA / 运维排查

---

### 2.3 字段映射规则

- Prisma：`camelCase`
- DB：`snake_case`
- 命名不一致 **必须** `@map`

```prisma
hostUserId String?   @map("host_user_id")
createdAt  DateTime  @map("created_at")
name       String?   
```

---

## 3. 主键（Primary Key）规范

### 3.1 默认主键方案（推荐）

```prisma
id String @id @default(cuid())
```

**选型理由（CUID）**
- 分布式安全，无中心
- 含时间因子，接近顺序写入
- URL 友好
- Prisma 原生支持

---

### 3.2 使用 CUID 的前提条件（非常重要）

必须满足以下条件，否则不得使用 CUID：

- 所有写入 **经由应用层**
- 多语言服务 **统一 CUID 实现**
- 不依赖 DB 生成主键
- 接受 `String` 作为 PK

不适用场景：
- 大量 COPY / 外部系统直写 DB
- DB-side 生成 ID
- 超大表（10^8+）对索引体积极端敏感

以上场景应使用 `uuid` / `ulid`

---

## 4. 外键（Foreign Key）与关系

### 4.1 外键字段命名

```prisma
tenantId  String @map("tenant_id")
meetingId String @map("meeting_id")
```

规则：
- `<关联模型名>Id`
- 所有外键字段 **必须建索引**

---

### 4.2 关系定义（必须完整）

```prisma
tenant Tenant @relation(
  fields: [tenantId],
  references: [id],
  onDelete: Restrict
)
```

---

### 4.3 删除策略默认值

| 场景 | onDelete |
|---|---|
| 核心业务数据 | Restrict |
| 从属资源 | Cascade |
| 可选引用 | SetNull |

---

## 5. 时间字段规范（强制）

### 5.1 标准时间字段

| 字段 | 必须 | 说明 |
|---|---|---|
| created_at | 是 | 创建时间 |
| updated_at | 是 | 更新时间 |
| deleted_at | 可选 | 软删除 |

```prisma
createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
updatedAt DateTime @updatedAt     @map("updated_at") @db.Timestamptz(6)
```

必须使用 `@updatedAt` 或 DB trigger（二选一）

---

### 5.2 业务时间字段命名

| 含义 | 示例 |
|---|---|
| 开始 | startAt |
| 结束 | endAt |
| 实际开始 | actualStartAt |
| 实际结束 | actualEndAt |

禁止：
- start_time
- beginTime

---

## 6. 状态字段（status）

```prisma
status Int @default(0) @db.SmallInt
```

- 字段名统一：`status`
- 类型：`smallint`
- 必须定义值域

示例：

| 值 | 含义 |
|---|---|
| 0 | 未开始 |
| 1 | 进行中 |
| 2 | 已结束 |
| 3 | 已取消 |

---

### 6.1 升级规则

- 初期：`smallint`
- 状态复杂 / 强约束：Prisma `enum`
- DB 层可加 `CHECK`

---

## 7. 枚举 / 字典字段

### 7.1 推荐（早期）

```prisma
source   Int @db.SmallInt
fileType Int @db.SmallInt
role     Int @db.SmallInt
```

### 7.2 中后期方案

- Prisma enum
- 或独立字典表（如 `dict_recording_source`）

---

## 8. JSON / 扩展字段

```prisma
metadata Json @default("{}") @db.JsonB
```

使用场景：
- AI 输出
- 可变结构
- 非核心字段

禁止：
- 核心关系
- 高频过滤字段

---

## 9. 索引规范

### 9.1 必建索引

| 场景 | 示例 |
|---|---|
| 外键 | meeting_id |
| 时间 | (tenant_id, created_at) |
| 状态 | (tenant_id, status) |

```prisma
@@index([tenantId, createdAt], map: "idx_meeting_tenant_created_at")
```

---

### 9.2 命名规则

- 普通索引：`idx_<table>_<fields>`
- 唯一索引：`uq_<table>_<fields>`

---

## 10. 软删除（如使用）

```prisma
deletedAt DateTime? @map("deleted_at") @db.Timestamptz(6)
```

规则：
- 默认查询过滤 `deleted_at IS NULL`
- 唯一约束需使用 **部分唯一索引**
- Prisma 不支持的索引用 SQL migration 管理

---

## 11. 审计 / 操作日志

```prisma
action     String
targetType String
targetId   String?
metadata   Json
createdAt  DateTime
```

规则：
- 只 INSERT
- 禁止 UPDATE / DELETE
- 推荐 DB 权限或 trigger 保护

---

## 12. 迁移与约束（强烈建议）

- 明确 NULL / NOT NULL
- 所有关系使用真实外键
- 核心字段使用 CHECK
- 不依赖应用层约定

---

## 13. 禁止事项（红线）

- Prisma 字段使用 snake_case
- JSON 代替关系表
- 业务表缺少 created_at
- 高频外键无索引
- magic number 无文档

---

## 14. 最终原则

> **Schema 是系统最稳定的 API，一旦发布，必须向后兼容。**

