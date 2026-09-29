# 腾讯会议集成 (TMeet Integration)

本项目集成了腾讯会议 OpenAPI 与 Webhook 回调体系，能够自动接收腾讯会议的录制完成、会议开始/结束等事件，并将会议数据与转写文件同步存储至 PostgreSQL 数据库中。

## 功能特性

- ✅ 腾讯会议 Webhook 签名验证（SHA1）与 AES 消息体解密
- ✅ 录制完成（`recording.completed`）、会议状态变更等事件自动捕获
- ✅ 录制文件元数据解析、下载与持久化
- ✅ 参会者列表与时长统计
- ✅ 会议转录文本和智能纪要处理与关联
- ✅ 多租户数据归属与组织上下文自动注入

## 项目结构

腾讯会议相关逻辑完全内聚在 `src/tmeet/` 目录下：

```text
src/tmeet/
├── client/                     # 腾讯会议 OpenAPI HTTP 客户端封装
├── controllers/
│   ├── tmeet.controller.ts     # 主动业务查询与操作控制器 (/tmeet)
│   └── tmeet-webhook.controller.ts # Webhook 回调控制器 (/webhooks/tmeet)
├── services/
│   ├── tmeet.service.ts        # 腾讯会议核心业务
│   ├── event-handler.service.ts# Webhook 事件分发中枢
│   └── tmeet-config.service.ts # 动态凭据读取与有效性校验
├── handlers/                   # 具体 Webhook 事件处理器
│   ├── recording-completed.handler.ts
│   ├── meeting-ended.handler.ts
│   └── meeting-started.handler.ts
├── pipes/                      # URL 验证与 Body 解密管道
├── interceptors/               # Webhook 日志拦截与耗时追踪
└── tmeet.module.ts             # 模块装配与导出
```

## 服务凭据配置

腾讯会议的应用凭据（`appId`、`sdkId`、`secretId`、`secretKey`、`userId`、`webhookToken`、`encodingAesKey`）统一在 **Nove Admin 管理后台「服务集成 → 腾讯会议」** 中进行动态加密维护，无需通过 `.env` 环境变量写入。

详见[服务集成配置指南](../service-integrations.md)。

## Webhook 端点

端点为 `/webhooks/tmeet`：

### 1. URL 有效性验证 (GET)

```text
GET /webhooks/tmeet?check_str={base64_string}
Headers:
  timestamp: {timestamp}
  nonce: {nonce}
  signature: {signature}
```

腾讯会议开放平台在配置或修改 Webhook 地址时，会发起 GET 请求校验签名，并要求返回解密后的明文字符串。

### 2. 事件通知接收 (POST)

```text
POST /webhooks/tmeet
Content-Type: application/json
Headers:
  timestamp: {timestamp}
  nonce: {nonce}
  signature: {signature}

{
  "data": "base64_encoded_encrypted_data"
}
```

接收加密的回调事件通知，系统通过 `BodyDecryptionPipe` 完成验签和解密，由 `TMeetEventHandlerService` 派发给具体的 Handler 异步处理，并将处理日志落库至 `webhook_logs`。

## 常见排障

1. **Webhook 校验失败**：
   - 检查管理后台「服务集成」中填写的 `webhookToken` 与 `encodingAesKey` 是否与腾讯会议后台一致。
   - 检查服务器系统时间与当前时间偏差是否过大（导致时间戳签名校验不通过）。
2. **事件未入库**：
   - 查询 `webhook_logs` 表，排查 `status` 为 `FAILED` 的记录与详细错误日志。
