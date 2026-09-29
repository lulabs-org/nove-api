# 腾讯会议 Webhook 本地测试指南

本文档提供在本地或测试环境中对腾讯会议 Webhook 接口进行调试和模拟验证的方法。

## 接口说明

- **URL 验证 (GET)**：`http://localhost:3000/webhooks/tmeet`
- **事件接收 (POST)**：`http://localhost:3000/webhooks/tmeet`

测试前请先在本地启动服务：

```bash
pnpm start:dev
```

确保 Nove Admin 管理后台「服务集成 → 腾讯会议」中已配置好 `webhookToken` 与 `encodingAesKey`。

---

## 方式一：使用内置集成测试 (推荐)

项目中包含完整的集成测试，可直接使用 Jest 模拟腾讯会议的加密与回调行为：

```bash
pnpm exec jest test/integration/tmeet/tmeet-webhook.int-spec.ts
```

此测试会自动生成符合腾讯会议标准的签名和 AES 加密体，验证管道解密与事件入库逻辑。

---

## 方式二：使用 Postman 模拟请求

### 1. 环境变量设置

在 Postman 环境变量中配置：

- `base_url`: `http://localhost:3000`
- `webhookToken`: 你的 Webhook Token
- `encodingAesKey`: 你的 43 位 EncodingAESKey

### 2. 测试 URL 验证 (GET)

请求方式：`GET {{base_url}}/webhooks/tmeet?check_str=hello_tencent`

在 **Pre-request Script** 中加入以下签名生成逻辑：

```javascript
const crypto = require('crypto-js');

const token = pm.environment.get('webhookToken');
const timestamp = Math.floor(Date.now() / 1000).toString();
const nonce = Math.random().toString(36).substring(2, 15);
const checkStr = 'hello_tencent';

// 腾讯会议签名算法: 对 token, timestamp, nonce, check_str 字典序排序后拼接入库 SHA1
const arr = [token, timestamp, nonce, checkStr].sort();
const signature = crypto.SHA1(arr.join('')).toString();

pm.request.headers.add({ key: 'timestamp', value: timestamp });
pm.request.headers.add({ key: 'nonce', value: nonce });
pm.request.headers.add({ key: 'signature', value: signature });
```

预期响应：返回解密后的明文字符串。

### 3. 测试事件接收 (POST)

请求方式：`POST {{base_url}}/webhooks/tmeet`

请求体格式：`application/json`

```json
{
  "data": "{{encrypted_data}}"
}
```

并在 Headers 中携带对应的 `timestamp`、`nonce` 和 `signature`。

---

## 常见支持的事件类型

- `meeting.start`：会议开始
- `meeting.end`：会议结束
- `meeting.join`：参会人入会
- `meeting.leave`：参会人离会
- `recording.completed`：云录制完成与文件就绪
