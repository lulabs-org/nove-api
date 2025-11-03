# 平台用户测试数据生成器

## 概述

独立的平台用户测试数据生成工具，用于快速创建和管理 PlatformUser 表的测试数据。支持多种会议平台（腾讯会议、Zoom、飞书、钉钉、Teams、Webex），可选关联到本地 User 表。

## 功能特性

- ✅ 批量创建测试平台用户（支持 1-1000 个）
- ✅ 支持 6 种主流会议平台
- ✅ 自动生成平台特定数据
- ✅ 可选关联到本地 User 表
- ✅ 分布式创建（在多个平台间均匀分布）
- ✅ 独立清理测试数据
- ✅ 查看详细统计信息

## 支持的平台

| 平台 | 枚举值 | 说明 |
|------|--------|------|
| 腾讯会议 | `TENCENT_MEETING` | 包含实例ID、用户角色、手机号哈希 |
| Zoom | `ZOOM` | 包含账户ID、PMI、时区 |
| 飞书 | `FEISHU` | 包含 OpenID、UnionID、员工号 |
| 钉钉 | `DINGTALK` | 包含 UnionID、OpenID、员工ID |
| Teams | `TEAMS` | 包含 ObjectID、TenantID、UPN |
| Webex | `WEBEX` | 包含 PersonID、OrgID、SIP地址 |

## 快速开始

### 1. 创建测试平台用户

```bash
# 创建 10 个平台用户（默认，在各平台间均匀分布）
pnpm db:test-platform-users:create

# 创建 30 个平台用户
tsx prisma/seeds/platform-users-test-data.ts create 30
```

### 2. 查看测试平台用户

```bash
# 查看所有测试平台用户的统计信息
pnpm db:test-platform-users:stats
```

### 3. 清理测试平台用户

```bash
# 删除所有测试平台用户数据
pnpm db:test-platform-users:clean
```

## 命令详解

### 创建测试平台用户

#### 基础用法

```bash
# 使用 npm scripts（创建 10 个）
pnpm db:test-platform-users:create

# 直接使用 tsx（可指定数量和选项）
tsx prisma/seeds/platform-users-test-data.ts create [数量] [选项]
```

#### 高级选项

**指定平台创建**

```bash
# 创建 20 个腾讯会议用户
tsx prisma/seeds/platform-users-test-data.ts create 20 --platform=TENCENT_MEETING

# 创建 15 个 Zoom 用户
tsx prisma/seeds/platform-users-test-data.ts create 15 --platform=ZOOM

# 创建 10 个飞书用户
tsx prisma/seeds/platform-users-test-data.ts create 10 --platform=FEISHU
```

**关联到本地用户**

```bash
# 创建 30 个平台用户并关联到本地测试用户
tsx prisma/seeds/platform-users-test-data.ts create 30 --link-user

# 创建 50 个 Zoom 用户并关联本地用户
tsx prisma/seeds/platform-users-test-data.ts create 50 --platform=ZOOM --link-user
```

**分布式创建**

```bash
# 创建 60 个用户，在 6 个平台间均匀分布（每个平台 10 个）
tsx prisma/seeds/platform-users-test-data.ts create 60

# 创建 100 个用户，随机选择平台（不均匀分布）
tsx prisma/seeds/platform-users-test-data.ts create 100 --no-distribute
```

### 查看统计信息

```bash
# 使用 npm scripts
pnpm db:test-platform-users:stats

# 直接使用 tsx
tsx prisma/seeds/platform-users-test-data.ts stats
```

**输出信息包括：**
- 测试平台用户总数
- 各平台的用户分布
- 每个用户的详细信息（姓名、邮箱、手机、平台ID、关联用户、参会次数等）

### 清理测试平台用户

```bash
# 使用 npm scripts
pnpm db:test-platform-users:clean

# 直接使用 tsx
tsx prisma/seeds/platform-users-test-data.ts clean
```

**清理范围：**
- 删除所有测试平台用户
- 自动删除关联的参会记录（MeetingParticipation）
- 不影响本地 User 表数据
- 不影响会议记录（Meetings）

## 使用场景

### 场景 1：测试多平台会议功能

```bash
# 创建各平台用户用于测试
tsx prisma/seeds/platform-users-test-data.ts create 60

# 查看创建结果
pnpm db:test-platform-users:stats

# 测试完成后清理
pnpm db:test-platform-users:clean
```

### 场景 2：测试特定平台功能

```bash
# 创建 30 个腾讯会议用户
tsx prisma/seeds/platform-users-test-data.ts create 30 --platform=TENCENT_MEETING

# 查看统计
pnpm db:test-platform-users:stats
```

### 场景 3：测试用户关联功能

```bash
# 先创建本地测试用户
pnpm db:test-users:create

# 创建平台用户并关联
tsx prisma/seeds/platform-users-test-data.ts create 20 --link-user

# 查看关联结果
pnpm db:test-platform-users:stats
```

### 场景 4：性能测试

```bash
# 创建大量平台用户
tsx prisma/seeds/platform-users-test-data.ts create 500

# 测试完成后清理
pnpm db:test-platform-users:clean
```

## 生成的数据特征

### 通用字段

- **邮箱格式**：`test_platform_user_[序号]@[平台域名]`
  - 腾讯会议：`@meeting.tencent.com`
  - Zoom：`@zoom.us`
  - 飞书：`@feishu.cn`
  - 钉钉：`@dingtalk.com`
  - Teams：`@teams.microsoft.com`
  - Webex：`@webex.com`

- **平台用户ID格式**：`[平台前缀]_test_platform_user_[序号]_[时间戳]`
  - 腾讯会议：`tm_test_platform_user_1_1234567890`
  - Zoom：`zoom_test_platform_user_1_1234567890`
  - 等等...

- **手机号**：`139000000xx`（自动递增）

- **姓名**：
  - 中文平台（腾讯会议、飞书、钉钉）：随机中文姓名
  - 国际平台（Zoom、Teams、Webex）：随机英文姓名

### 平台特定数据

#### 腾讯会议 (TENCENT_MEETING)

```json
{
  "instanceId": 1000001,
  "userRole": 1,
  "phoneHash": "MTM5MDAwMDAwMDE="
}
```

#### Zoom

```json
{
  "accountId": "acc_1",
  "pmi": 1000000001,
  "timezone": "Asia/Shanghai"
}
```

#### 飞书 (FEISHU)

```json
{
  "openId": "ou_1",
  "unionId": "on_1",
  "employeeNo": "EMP000001"
}
```

#### 钉钉 (DINGTALK)

```json
{
  "unionId": "union_1",
  "openId": "open_1",
  "staffId": "staff_1"
}
```

#### Teams

```json
{
  "objectId": "obj_1",
  "tenantId": "tenant_1",
  "userPrincipalName": "test_platform_user_1@teams.microsoft.com"
}
```

#### Webex

```json
{
  "personId": "person_1",
  "orgId": "org_1",
  "sipAddress": "sip_1@webex.com"
}
```

## 与本地用户的关联

### 关联机制

使用 `--link-user` 选项时，平台用户会循环关联到前 10 个本地测试用户：

```bash
# 先创建本地测试用户
pnpm db:test-users:create

# 创建平台用户并关联
tsx prisma/seeds/platform-users-test-data.ts create 30 --link-user
```

**关联规则：**
- 平台用户 1 → 本地用户 1
- 平台用户 2 → 本地用户 2
- ...
- 平台用户 10 → 本地用户 10
- 平台用户 11 → 本地用户 1（循环）
- 平台用户 12 → 本地用户 2（循环）

### 查看关联关系

```bash
pnpm db:test-platform-users:stats
```

输出示例：
```
1. [腾讯会议] 张伟
   邮箱: test_platform_user_1@meeting.tencent.com
   手机: 13900000001
   平台ID: tm_test_platform_user_1_1234567890
   关联用户: test_user_1@example.com  ← 显示关联的本地用户
   参会次数: 0
   主持会议: 0
   状态: 活跃
```

## 完整工作流示例

### 示例 1：测试会议系统

```bash
# 1. 创建本地测试用户
pnpm db:test-users:create

# 2. 创建平台用户（60个，分布在6个平台）
tsx prisma/seeds/platform-users-test-data.ts create 60 --link-user

# 3. 查看创建结果
pnpm db:test-platform-users:stats

# 4. 进行测试...

# 5. 清理测试数据
pnpm db:test-platform-users:clean
pnpm db:test-users:clean
```

### 示例 2：测试腾讯会议集成

```bash
# 1. 创建 50 个腾讯会议用户
tsx prisma/seeds/platform-users-test-data.ts create 50 --platform=TENCENT_MEETING

# 2. 查看统计
pnpm db:test-platform-users:stats

# 3. 测试腾讯会议相关功能...

# 4. 清理
pnpm db:test-platform-users:clean
```

## 注意事项

1. **数据隔离**：测试平台用户通过邮箱前缀和平台用户ID标识，清理时只删除测试数据

2. **数量限制**：单次最多创建 1000 个用户，避免数据库压力过大

3. **并发控制**：创建时使用批处理（每批 5 个），避免数据库连接过多

4. **重复创建**：如果平台用户已存在（平台+平台用户ID重复），会自动跳过

5. **关联数据清理**：清理时会自动删除关联的参会记录，但不会删除会议记录

6. **本地用户关联**：使用 `--link-user` 时，需要先创建本地测试用户

7. **平台特定数据**：每个平台都有特定的数据结构，存储在 `platformData` 字段中

## 与其他测试数据的配合

### 配合本地用户测试数据

```bash
# 创建本地用户
pnpm db:test-users:create

# 创建平台用户并关联
tsx prisma/seeds/platform-users-test-data.ts create 30 --link-user

# 查看两者的统计
pnpm db:test-users:stats
pnpm db:test-platform-users:stats

# 清理
pnpm db:test-platform-users:clean
pnpm db:test-users:clean
```

### 数据关系图

```
User (本地用户表)
  ↓ (可选关联)
PlatformUser (平台用户表)
  ↓
MeetingParticipation (参会记录)
  ↓
Meetings (会议记录)
```

## 常见问题

### Q: 如何只创建特定平台的用户？

A: 使用 `--platform` 参数：
```bash
tsx prisma/seeds/platform-users-test-data.ts create 20 --platform=ZOOM
```

### Q: 如何让平台用户关联到本地用户？

A: 先创建本地测试用户，然后使用 `--link-user` 参数：
```bash
pnpm db:test-users:create
tsx prisma/seeds/platform-users-test-data.ts create 30 --link-user
```

### Q: 分布式创建是什么意思？

A: 默认情况下，用户会在 6 个平台间均匀分布。例如创建 60 个用户，每个平台会有 10 个。使用 `--no-distribute` 可以随机选择平台。

### Q: 如何自定义平台特定数据？

A: 编辑 `prisma/seeds/platform-users-test-data.ts` 文件中的 `generatePlatformData` 函数。

### Q: 清理会影响真实数据吗？

A: 不会。清理只删除邮箱或平台用户ID包含 `test_platform_user_` 的数据。

### Q: 可以创建参会记录吗？

A: 当前版本不支持。如需创建参会记录，请使用主种子数据系统或手动创建。

## 技术实现

### 数据生成策略

- **姓名生成**：根据平台类型选择中文或英文姓名
- **平台ID生成**：使用平台前缀 + 测试前缀 + 序号 + 时间戳
- **邮箱生成**：使用测试前缀 + 序号 + 平台域名
- **平台数据生成**：根据平台类型生成特定的数据结构

### 性能优化

- **批量处理**：每批处理 5 个用户，避免并发过高
- **错误处理**：单个用户创建失败不影响其他用户
- **索引优化**：利用数据库索引加速查询

## 相关文档

- [用户测试数据文档](./USER_TEST_DATA.md)
- [数据库种子数据文档](./PRISMA_SETUP.md)
- [会议模型定义](../prisma/models/meet.prisma)
- [用户模型定义](../prisma/models/user.prisma)
