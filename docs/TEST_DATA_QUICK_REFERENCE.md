# 测试数据快速参考

## 概述

本文档提供所有测试数据生成器的快速参考命令。

## 可用的测试数据生成器

| 生成器 | 表 | 文档 |
|--------|-----|------|
| 用户测试数据 | `User`, `UserProfile` | [USER_TEST_DATA.md](./USER_TEST_DATA.md) |
| 平台用户测试数据 | `PlatformUser` | [PLATFORM_USER_TEST_DATA.md](./PLATFORM_USER_TEST_DATA.md) |

## 快速命令

### 用户测试数据 (User)

```bash
# 创建
pnpm db:test-users:create                                    # 创建 10 个
tsx prisma/seeds/users-test-data.ts create 50               # 创建 50 个

# 查看
pnpm db:test-users:stats

# 清理
pnpm db:test-users:clean
```

**特征：**
- 邮箱：`test_user_[序号]@example.com`
- 密码：`test123`
- 手机：`138000000xx`

### 平台用户测试数据 (PlatformUser)

```bash
# 创建（分布式）
pnpm db:test-platform-users:create                          # 创建 10 个，均匀分布
tsx prisma/seeds/platform-users-test-data.ts create 60     # 创建 60 个，均匀分布

# 创建（指定平台）
tsx prisma/seeds/platform-users-test-data.ts create 20 --platform=TENCENT_MEETING
tsx prisma/seeds/platform-users-test-data.ts create 15 --platform=ZOOM
tsx prisma/seeds/platform-users-test-data.ts create 10 --platform=FEISHU

# 创建（关联本地用户）
tsx prisma/seeds/platform-users-test-data.ts create 30 --link-user

# 查看
pnpm db:test-platform-users:stats

# 清理
pnpm db:test-platform-users:clean
```

**特征：**
- 邮箱：`test_platform_user_[序号]@[平台域名]`
- 支持 6 个平台：腾讯会议、Zoom、飞书、钉钉、Teams、Webex
- 可关联到本地用户

## 常用工作流

### 工作流 1：基础测试

```bash
# 创建本地用户
pnpm db:test-users:create

# 查看
pnpm db:test-users:stats

# 测试...

# 清理
pnpm db:test-users:clean
```

### 工作流 2：会议系统测试

```bash
# 1. 创建本地用户
pnpm db:test-users:create

# 2. 创建平台用户并关联
tsx prisma/seeds/platform-users-test-data.ts create 60 --link-user

# 3. 查看统计
pnpm db:test-users:stats
pnpm db:test-platform-users:stats

# 4. 测试...

# 5. 清理
pnpm db:test-platform-users:clean
pnpm db:test-users:clean
```

### 工作流 3：特定平台测试

```bash
# 创建腾讯会议用户
tsx prisma/seeds/platform-users-test-data.ts create 30 --platform=TENCENT_MEETING

# 查看
pnpm db:test-platform-users:stats

# 测试...

# 清理
pnpm db:test-platform-users:clean
```

### 工作流 4：性能测试

```bash
# 创建大量用户
tsx prisma/seeds/users-test-data.ts create 500
tsx prisma/seeds/platform-users-test-data.ts create 500

# 查看统计
pnpm db:test-users:stats
pnpm db:test-platform-users:stats

# 性能测试...

# 清理
pnpm db:test-platform-users:clean
pnpm db:test-users:clean
```

## 支持的平台

| 平台 | 枚举值 | 域名 |
|------|--------|------|
| 腾讯会议 | `TENCENT_MEETING` | `meeting.tencent.com` |
| Zoom | `ZOOM` | `zoom.us` |
| 飞书 | `FEISHU` | `feishu.cn` |
| 钉钉 | `DINGTALK` | `dingtalk.com` |
| Teams | `TEAMS` | `teams.microsoft.com` |
| Webex | `WEBEX` | `webex.com` |

## 命令参数说明

### 用户测试数据

| 命令 | 参数 | 说明 |
|------|------|------|
| `create` | `[数量]` | 创建指定数量的用户（1-1000） |
| `clean` | - | 清理所有测试用户 |
| `stats` | - | 查看统计信息 |

### 平台用户测试数据

| 命令 | 参数 | 说明 |
|------|------|------|
| `create` | `[数量]` | 创建指定数量的平台用户（1-1000） |
| `create` | `--platform=<平台>` | 指定平台 |
| `create` | `--link-user` | 关联到本地用户 |
| `create` | `--no-distribute` | 不分布式创建 |
| `clean` | - | 清理所有测试平台用户 |
| `stats` | - | 查看统计信息 |

## 数据关系

```
User (本地用户)
  ├─ UserProfile (用户档案)
  └─ PlatformUser (平台用户) [可选关联]
       └─ MeetingParticipation (参会记录)
            └─ Meetings (会议记录)
```

## 注意事项

1. **数据隔离**：所有测试数据都有特定前缀标识，清理时只删除测试数据
2. **数量限制**：单次最多创建 1000 个，避免数据库压力
3. **并发控制**：使用批处理，避免连接过多
4. **关联顺序**：使用 `--link-user` 时，需要先创建本地用户
5. **清理顺序**：建议先清理平台用户，再清理本地用户

## 主种子数据系统

如需初始化完整的系统数据（包括角色、权限、组织等），使用主种子数据系统：

```bash
# 初始化所有数据
pnpm db:seed

# 清理所有数据
pnpm db:cleandata

# 重置数据库
pnpm db:seed:reset

# 删除所有表
pnpm db:drop
pnpm db:drop:force  # 强制删除
```

详见：[数据库种子数据文档](./PRISMA_SETUP.md)

## 故障排除

### 问题：创建失败

**可能原因：**
- 数据库连接失败
- 用户已存在（邮箱或平台用户ID重复）

**解决方案：**
```bash
# 检查数据库连接
pnpm db:studio

# 清理现有测试数据
pnpm db:test-users:clean
pnpm db:test-platform-users:clean

# 重新创建
pnpm db:test-users:create
pnpm db:test-platform-users:create
```

### 问题：关联失败

**可能原因：**
- 本地用户不存在

**解决方案：**
```bash
# 先创建本地用户
pnpm db:test-users:create

# 再创建平台用户并关联
tsx prisma/seeds/platform-users-test-data.ts create 30 --link-user
```

### 问题：清理不完整

**可能原因：**
- 外键约束

**解决方案：**
```bash
# 按正确顺序清理
pnpm db:test-platform-users:clean  # 先清理平台用户
pnpm db:test-users:clean            # 再清理本地用户
```

## 相关文档

- [用户测试数据详细文档](./USER_TEST_DATA.md)
- [平台用户测试数据详细文档](./PLATFORM_USER_TEST_DATA.md)
- [数据库种子数据文档](./PRISMA_SETUP.md)
- [项目架构文档](./ARCHITECTURE.md)
