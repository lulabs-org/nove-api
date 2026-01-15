# Auth & Verification 设计问题汇总

以下 Issues 基于当前代码实现与使用流程整理，便于跟踪修复与评审。

## ISSUE-001: 登录类型与字段匹配缺少强校验

**模块/范围**: `auth` 登录流程

**问题描述**:
- `LoginService` 仅从 `username/email/phone` 中选择第一个非空作为 `target`，未校验与 `type` 的一致性，导致 `type=email_code` 但传 `username` 也会进入验证码校验流程。
- `LoginDto` 中 `username/email/phone` 均为可选字段，缺少基于 `type` 的必填/互斥约束。

**影响**:
- 客户端容易产生“验证码无效/登录失败”的不明原因问题。
- 误用接口的场景难以排查，增加支持成本。

**建议修复**:
- 在 DTO 或 Service 中增加 `type` 与字段的强校验逻辑（例如 `email_code` 必须 `email+code`，`phone_code` 必须 `phone+code`，`email_password` 必须 `email+password`）。
- 返回更明确的错误信息，方便调用方纠正。

## ISSUE-002: `/verification/verify` 会直接消费验证码

**模块/范围**: `verification` 验证流程

**问题描述**:
- `/verification/verify` 成功校验后会立即标记验证码为已使用。
- 如果客户端先调用 `/verification/verify` 做“验证码有效性检查”，再进行注册/登录，会因验证码已被消费而失败。

**影响**:
- 与常见 UI 流程“先验证再提交”存在冲突，造成用户体验不佳。

**建议修复**:
- 区分“仅校验”和“校验并消费”两类接口/动作，或在文档中明确该接口会消费验证码。

## ISSUE-003: 手机号验证对国际号码支持不足，验证码维度与国家码不一致

**模块/范围**: `verification` 发送/校验逻辑

**问题描述**:
- 发送验证码时仅使用 `isValidCnPhone` 校验，非中国手机号可能无法发送。
- 验证码仅以 `target` 字符串（手机号）作为维度存储与校验，`countryCode` 未参与匹配。

**影响**:
- 国际手机号难以使用验证码功能。
- 相同本地号码在不同国家可能发生验证码冲突。

**建议修复**:
- 使用更通用的手机号校验或基于 `countryCode` 进行校验。
- 存储/查询验证码时使用 `E.164` 完整号码，或显式存储 `(countryCode, phone)` 作为唯一维度。

## ISSUE-004: 注册唯一性与验证码维度不一致

**模块/范围**: `auth` 注册 + `verification` 验证

**问题描述**:
- 注册唯一性检查依赖 `(countryCode, phone)` 组合。
- 验证码校验仅基于 `target` 字符串，未包含 `countryCode`。

**影响**:
- 注册逻辑与验证码逻辑的唯一性维度不一致，存在误用/冲突风险。

**建议修复**:
- 让验证码存储与校验维度与注册唯一性保持一致（使用 `E.164` 或 `(countryCode, phone)`）。
