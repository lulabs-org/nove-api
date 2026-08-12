# 版本号 / 分支 / Git Tag / Docker Tag 对照表

## 1. 版本阶段总览表（核心）

| 阶段 | 稳定性 | 是否可加功能 | 常见分支 | Git Tag 示例 | Docker Tag 示例 | 用途 |
|------|--------|--------------|----------|--------------|-----------------|------|
| insiders / nightly | ❌ 极不稳定 | ✅ 可以 | develop | v1.8.3-insiders.20250201 | myapp:1.8.3-insiders.20250201 | 内部日常构建 |
| alpha | ❌ 不稳定 | ✅ 可以 | develop | v1.8.3-alpha.2 | myapp:1.8.3-alpha.2 | 内部测试 |
| beta | ⚠️ 较稳定 | ⚠️ 尽量少 | develop / release | v1.8.3-beta.1 | myapp:1.8.3-beta.1 | 测试 / 灰度 |
| rc | ✅ 接近正式 | ❌ 不可以 | release / hotfix | v1.8.3-rc.1 | myapp:1.8.3-rc.1 | 发布候选 |
| 正式版 | ✅ 稳定 | ❌ 不可以 | main | v1.8.3 | myapp:1.8.3 | 生产环境 |
| hotfix | ✅ 稳定 | ❌ 不可以 | hotfix → main | v1.8.4 | myapp:1.8.4 | 紧急修复 |

---

## 2. 分支 vs 能打什么 Tag（防出事故表）

| 分支 | insiders / alpha | beta | rc | 正式版 |
|------|------------------|------|----|--------|
| feature/* | ❌ | ❌ | ❌ | ❌ |
| develop | ✅ | ✅ | ❌ | ❌ |
| release/* | ❌ | ✅ | ✅ | ❌ |
| hotfix/* | ❌ | ❌ | ✅（可选） | ❌ |
| main | ❌ | ❌ | ❌ | ✅ |

> **记住一句话：** 正式版 tag（vX.Y.Z）只允许出现在 main 上

---

## 3. Docker Tag 标准组合（强烈推荐）

| 类型 | 示例 | 说明 |
|------|------|------|
| 版本号 | myapp:1.8.3 | 人看的，正式部署 |
| 版本 + commit | myapp:1.8.3-a1b2c3d | 排查问题 |
| commit 固定 | myapp:sha-a1b2c3d | 100% 可复现 |
| rc | myapp:1.8.3-rc.1 | 测试 / 预发 |
| alpha / insiders | myapp:1.8.3-alpha.2 | 开发 / 内测 |
| latest（慎用） | myapp:latest | 仅指向最新正式版 |

---

## 4. 版本号升级规则表（不纠结）

| 场景 | 示例 |
|------|------|
| 修 bug | 1.8.3 → 1.8.4 |
| 新功能（兼容） | 1.8.3 → 1.9.0 |
| 不兼容改动 | 1.8.3 → 2.0.0 |

---

## 5. 快速判断口诀（贴墙版）

```
develop  → alpha / beta
release  → rc
main     → 正式版
hotfix   → 修完再回 main
```

---

## 6. 最重要的 3 条铁律

1. **vX.Y.Z 只在 main 打**
2. **rc / alpha / insiders 永远不上生产**
3. **生产 Docker 必须能定位到 commit**

---

