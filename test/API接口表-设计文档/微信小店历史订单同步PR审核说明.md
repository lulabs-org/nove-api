# 微信小店历史订单同步 PR 审核说明

## 背景

当前系统已经有 `POST /webhooks/wechat/orders`，用于接收飞书集成平台转换后的单条微信订单并写入 `orders` 表。但历史数据补齐存在两个问题：

- 只能依赖外部平台逐条推送，无法主动补齐上线前、漏推、重放失败的历史订单。
- 订单补齐需要可重复执行，且需要按时间范围控制批次，避免一次性拉取过大导致外部接口或数据库压力不可控。

本 PR 增加历史订单同步能力，目标是让后端可以主动从微信小店接口拉取指定时间范围内的订单，复用现有订单写入逻辑，幂等写入 `orders` 表。

## 本 PR 增加了什么

- 新增接口：`POST /webhooks/wechat/orders/history-sync`
- 新增 DTO：`WechatOrderHistorySyncDto`
- 新增微信小店客户端：`WechatShopOrderClientService`
- 新增微信小店订单响应类型：`wechat-shop.types.ts`
- 新增时间切片工具和单测：`wechat-order-sync.util.ts` / `wechat-order-sync.util.spec.ts`
- `OrderService` 增加历史同步编排逻辑，并复用现有 `upsertWechatOrder`

当前历史分支不包含增量同步接口和定时任务。增量同步已经抽到本地分支 `feat/wechat-shop-incremental-orders`，避免本 PR 同时承载“历史补齐”和“持续同步调度”两个范围。

## 接口设计

接口路径：

```http
POST /webhooks/wechat/orders/history-sync
```

请求字段：

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `startTime` | 是 | 同步开始时间，ISO 8601 格式 |
| `endTime` | 是 | 同步结束时间，ISO 8601 格式 |
| `timeType` | 否 | `create` 或 `update`，默认 `create` |
| `status` | 否 | 微信小店订单状态，不传则同步全部状态 |
| `pageSize` | 否 | 每页数量，默认 100，最大 100 |
| `dryRun` | 否 | 仅拉取和解析，不写入数据库 |

响应核心字段：

| 字段 | 说明 |
| --- | --- |
| `fetched` | 从微信订单列表接口拿到的订单 ID 数量 |
| `created` | 新建订单数量 |
| `updated` | 更新订单数量 |
| `failedCount` | 单条订单详情拉取或写入失败数量 |
| `failed` | 失败订单 ID 和原因 |
| `dryRun` | 本次是否为试跑 |

## 为什么需要 7 天时间切片

微信小店订单列表接口对单次时间范围有限制，历史补齐通常会跨越较长时间。如果把调用方传入的完整区间直接发给微信接口，容易被外部接口拒绝。

因此服务端统一把 `startTime` 到 `endTime` 切成不超过 7 天的连续窗口，再逐窗口分页拉取。这样调用方只需要传业务上的完整补齐区间，后端负责适配微信接口限制。

## 为什么直接写入 `orders` 表

当前订单主流程已经以 `orders` 表作为统一订单事实表，现有单条 webhook 也是写入该表。历史同步复用同一套 `upsertWechatOrder`，可以保证：

- 幂等：按微信订单号写入 `externalId`，已存在则更新，不存在则创建。
- 一致：历史补齐和单条 webhook 使用同一套内部字段映射。
- 可追溯：微信原始订单保存在 `metadata.rawOrder`，关键映射字段保存在 `metadata.mapped`。

本 PR 没有新增 Prisma schema 或迁移，避免为了同步入口引入新的存储结构。

## 字段映射原则

历史同步会把微信订单映射到现有 `WechatOrderWebhookDto`，再复用已有创建/更新逻辑：

| 微信字段 | 内部字段 |
| --- | --- |
| `order_id` | `externalId` / `orderId` |
| `status` | `OrderStatus` |
| `pay_info.pay_time` | `paidAt` |
| `price_info.order_price` | `amount` |
| `pay_info.transaction_id` | `providerTradeNo` |
| 首个 `product_infos.title` | `productName` |
| `delivery_info.address_info.tel_number` | `phone` |
| 原始响应 | `metadata.rawOrder` |

微信 `product_id`、`sku_id`、`sku_code` 暂时保存在 `metadata.mapped`，没有直接写入 `orders.productId`。原因是 `orders.productId` 是内部 `Product` 表外键，微信商品 ID 不一定等于内部产品 ID，直接写入可能造成外键错误或错误关联。

## 错误处理

- 时间格式错误或 `startTime >= endTime` 会直接返回参数错误。
- 微信 access token 缺失、微信接口异常会返回服务不可用错误。
- 单条订单详情拉取或写入失败会记录到 `failed`，不影响同一页其他订单继续同步。
- 列表接口失败会中止本次同步，因为没有可靠的订单 ID 列表就无法继续分页。

## 配置项

支持两种认证方式：

| 环境变量 | 说明 |
| --- | --- |
| `WECHAT_SHOP_ACCESS_TOKEN` | 直接使用已有 access token，适合本地调试或临时补数 |
| `WECHAT_SHOP_APP_ID` / `WECHAT_SHOP_APP_SECRET` | 自动获取并缓存微信 access token |
| `WECHAT_SHOP_API_BASE_URL` | 可选，默认 `https://api.weixin.qq.com`，方便沙箱或 mock |

## 安全和发布注意事项

该接口当前延续 `webhooks/wechat/orders` 下现有公开入口风格，使用 `@Public()`。由于它会主动拉取外部接口并写入数据库，生产环境建议配合网关、内网访问、临时路由开关或后续 API key 鉴权限制调用方。

本 PR 的定位是历史数据补齐能力，不包含定时增量同步。持续调度、定时任务开关和 lookback 策略放在独立分支评审，可以降低本 PR 的审核范围和上线风险。

## 本次审核后补充调整

- 已将 `status` 的 Swagger 说明和 class-validator 校验统一为最小值 `10`，避免接口文档和实际校验不一致。
- 已修正时间切片工具注释和单测描述，改为“连续 7 天窗口”，避免注释提到边界重叠但实现是首尾相接。
- 已移除 controller 尾部多余空行，减少格式类 review 噪音。
- 已确认当前历史分支相对 `develop` 不包含增量同步接口、增量 DTO、定时任务或 `WECHAT_ORDER_INCREMENTAL_*` 配置逻辑。
- 仍需 reviewer 关注 `@Public()` 的安全边界：该设计是沿用现有 webhook 入口风格，建议上线时通过网关、内网访问或临时开放策略限制调用范围。

## Reviewer 可能关心的问题

### 为什么不依赖飞书集成平台补历史订单？

飞书链路适合单条实时入库，但历史补齐需要按时间范围批量拉取、失败重试和可控试跑。后端直接对接微信接口后，可以在问题排查和数据修复时主动补数。

### 为什么要保留 `dryRun`？

历史补齐通常影响范围大，`dryRun` 可以先验证时间范围、分页、字段映射和微信接口可用性，再进行真实写入。

### 为什么失败订单不中断整批？

历史订单同步更关注尽量补齐大多数数据。单条订单详情异常不应该阻塞整个时间段，失败列表会返回给调用方用于后续重试。

### 为什么不新增历史同步表？

当前需求是把微信历史订单补入统一订单表，不是建设同步审计系统。原始微信响应已经落到 `metadata`，可以满足排查需要；新增同步表会扩大 schema 和迁移范围。

### 为什么状态映射不是一比一保存微信状态码？

业务侧使用内部 `OrderStatus`，因此同步时转换为统一状态。微信原始状态码仍保存在 `metadata.rawOrder.status`，后续如果需要精细状态可以从 metadata 回溯。

## 本地验证

已验证：

```bash
pnpm test -- wechat-order-sync.util.spec.ts
pnpm build
```
