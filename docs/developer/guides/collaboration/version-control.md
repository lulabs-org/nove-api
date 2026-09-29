# 版本号 / 分支 / Git Tag / Docker Tag 对照表 (Trunk-Based)

本项目采用 **Trunk-Based Development (主干开发)** 模式，`main` 为单一可信主干（Trunk）。

## 1. 版本阶段总览表（核心）

| 阶段 | 稳定性 | 是否可加功能 | 常见分支 | Git Tag 示例 | Docker Tag 示例 | 用途 |
|------|--------|--------------|----------|--------------|-----------------|------|
| insiders / nightly | ❌ 极不稳定 | ✅ 可以 | main | `v1.9.0-insiders.20260928` | `noveapi:1.9.0-insiders.20260928` | 内部日常自动构建 |
| alpha | ❌ 不稳定 | ✅ 可以 | main | `v1.9.0-alpha.1` | `noveapi:1.9.0-alpha.1` | 内部集成测试 |
| beta | ⚠️ 较稳定 | ⚠️ 尽量少 | main / release | `v1.9.0-beta.1` | `noveapi:1.9.0-beta.1` | 灰度测试 |
| rc | ✅ 接近正式 | ❌ 不可以 | release / main | `v1.9.0-rc.1` | `noveapi:1.9.0-rc.1` | 发布候选 |
| 正式版 | ✅ 稳定 | ❌ 不可以 | main / release | `v1.9.0` | `noveapi:1.9.0` | 生产环境 |
| 补丁修复 | ✅ 稳定 | ❌ 不可以 | main / release | `v1.9.1` | `noveapi:1.9.1` | 生产 Bug 修复 |

---

## 2. 分支 vs 能打什么 Tag（防出事故表）

| 分支 | insiders / alpha | beta | rc | 正式版 |
|------|------------------|------|----|--------|
| 短期特性分支 (feat/*, fix/*) | ❌ | ❌ | ❌ | ❌ |
| main (Trunk 主干) | ✅ | ✅ | ✅ | ✅ |
| release/* (可选发布分支) | ❌ | ✅ | ✅ | ✅ |

> **主干铁律：** 正式版 Tag（`vX.Y.Z`）仅在通过所有 CI 测试的主干 `main` 或受保护的 `release/*` 上打出。

---

## 3. Docker Tag 标准组合（强烈推荐）

| 类型 | 示例 | 说明 |
|---|---|---|
| 版本号 | `noveapi:1.9.0` | 正式部署镜像 |
| 版本 + commit | `noveapi:1.9.0-a1b2c3d` | 快速定位具体代码版本 |
| commit 固定 | `noveapi:sha-a1b2c3d` | 100% 可复现镜像 |
| rc / beta | `noveapi:1.9.0-rc.1` | 测试 / 预发镜像 |
| alpha / insiders | `noveapi:1.9.0-alpha.1` | 开发 / 内测镜像 |
| latest（慎用） | `noveapi:latest` | 仅指向最新正式版镜像 |

---

## 4. 版本号升级规则表（语义化版本 SemVer）

| 场景 | 示例 | 触发条件 |
|---|---|---|
| 修 bug / 补丁 | `1.9.0 → 1.9.1` | 向后兼容的缺陷修复 |
| 新功能（向后兼容） | `1.9.0 → 1.10.0` | 新增向后兼容的功能特性 |
| 不兼容改动 | `1.9.0 → 2.0.0` | 包含重大不兼容的架构或 API 变更 |

---

## 5. 最重要的 3 条铁律

1. **`vX.Y.Z` 只在经过 CI 严格校验的 `main`（或 release 分支）打**
2. **`rc` / `alpha` / `insiders` 永远不上生产**
3. **生产 Docker 镜像标签必须能 100% 映射回具体的 Git Commit SHA**
