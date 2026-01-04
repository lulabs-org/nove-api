# 腾讯会议Webhook集成指南

## 概述

本文档说明如何配置和使用腾讯会议Webhook集成，包括事件接收、验证和处理流程。

## 功能特性

- ✅ **URL验证**: 支持GET和POST方式的URL验证
- ✅ **事件接收**: 支持会议创建、开始、结束、录制完成等事件
- ✅ **签名验证**: 严格按照腾讯会议要求进行签名验证
- ✅ **数据解密**: 支持AES-CBC解密和Base64解码
- ✅ **错误处理**: 完善的错误处理和日志记录
- ✅ **重试机制**: 符合腾讯会议重试策略

## 配置要求

### 环境变量

在`.env`文件中配置以下变量：

```bash
# 腾讯会议Webhook配置
TENCENT_MEETING_TOKEN=your_webhook_token
TENCENT_MEETING_ENCODING_AES_KEY=your_43_character_base64_key

# 飞书多维表格配置（可选）
LARK_BITABLE_APP_TOKEN=your_lark_bitable_app_token
LARK_TABLE_MEETING=your_meeting_table_id
```

### Webhook URL配置

在腾讯会议后台配置以下Webhook URL：

- **URL**: `https://your-domain.com/webhooks/tencent`
- **Token**: 与`TENCENT_MEETING_TOKEN`相同
- **EncodingAESKey**: 与`TENCENT_MEETING_ENCODING_AES_KEY`相同

## API端点

### API端点

### 1. URL验证端点（GET）

用于腾讯会议首次配置时的URL验证。

```
GET /webhooks/tencent?check_str={base64_string}&timestamp={timestamp}&nonce={nonce}&signature={signature}
```

**响应**: 返回解密后的明文字符串

### 2. 事件接收端点（POST）

用于接收腾讯会议的事件通知。

```
POST /webhooks/tencent
Content-Type: application/json

{
  "data": "base64_encoded_encrypted_data"
}
```

**Headers**:

- `timestamp`: 时间戳
- `nonce`: 随机数
- `signature`: 签名

> **注意**：严格按照腾讯会议最新文档要求，仅支持标准格式的Header参数。

**响应**: 必须返回字符串 `successfully received callback`（不含引号）

## 事件类型

### 支持的事件

| 事件类型 | 描述 | 处理逻辑 |
|---------|------|----------|
| `meeting.created` | 会议创建 | 记录会议信息到飞书多维表格 |
| `meeting.started` | 会议开始 | 更新会议状态 |
| `meeting.ended` | 会议结束 | 更新会议状态 |
| `recording.completed` | 录制完成 | 处理录制文件 |

### 事件数据结构

```typescript
interface TencentMeetingEvent {
  event: string;           // 事件类型
  trace_id: string;        // 唯一序列值
  payload: TencentEventPayload[];
}

interface TencentEventPayload {
  operate_time: number;    // 事件操作时间戳（毫秒）
  operator: {
    userid: string;        // 操作者ID
    user_name: string;     // 操作者名称
  };
  meeting_info: {
    meeting_id: string;    // 会议ID
    meeting_code: string;  // 会议号
    subject: string;       // 会议主题
    creator: {
      userid: string;      // 创建者ID
      user_name: string;   // 创建者名称
    };
    meeting_type: number;  // 会议类型
    start_time: number;    // 开始时间（秒）
    end_time: number;      // 结束时间（秒）
  };
}
```

## 签名验证

签名验证流程：

1. **参数排序**: 将token、timestamp、nonce、data四个参数按字典序排序
2. **字符串拼接**: 将排序后的参数拼接成一个字符串
3. **SHA1加密**: 对拼接后的字符串进行SHA1加密
4. **签名对比**: 将计算结果与header中的signature对比

## 数据解密

数据解密流程：

1. **Base64解码**: 对data字段进行Base64解码
2. **AES解密**: 使用AES-CBC模式解密，密钥为`TENCENT_MEETING_ENCODING_AES_KEY`
3. **PKCS7去填充**: 移除PKCS7填充
4. **UTF-8解码**: 将结果转换为UTF-8字符串
5. **JSON解析**: 解析为事件对象

## 测试

### 本地测试

1. **启动服务**:

```bash
npm run start:dev
```

2. **运行测试脚本**:

```bash
npm run test:tencent-webhook
```

### 手动测试

使用curl测试URL验证：

```bash
curl -X GET "http://localhost:3000/webhooks/tencent?check_str=dGVzdA==&timestamp=1234567890&nonce=123456&signature=computed_signature"
```

使用curl测试事件接收：

```bash
curl -X POST "http://localhost:3000/webhooks/tencent" \
  -H "Content-Type: application/json" \
  -H "timestamp: 1234567890" \
  -H "nonce: 123456" \
  -H "signature: computed_signature" \
  -d '{"data": "base64_encoded_data"}'
```

## 故障排查

### 常见问题

1. **签名验证失败**
   - 检查token配置是否正确
   - 确认时间戳、随机数、签名顺序正确

2. **解密失败**
   - 检查encodingAesKey长度是否为43位Base64字符串
   - 确认密钥与腾讯会议后台配置一致

3. **响应超时**
   - 确保5秒内返回响应
   - 事件处理使用异步方式，避免阻塞

### 日志查看

查看应用日志：

```bash
# 开发环境
npm run start:dev

# 生产环境
pm2 logs
```

日志中包含详细的验证和解密过程信息。

## 安全建议

1. **HTTPS**: 生产环境必须使用HTTPS
2. **Token安全**: 使用强随机字符串作为token
3. **密钥管理**: 妥善保管encodingAesKey
4. **访问控制**: 限制webhook端点的访问IP（可选）

## 更新日志

- **2024-01**: 初始版本
- **2024-02**: 优化错误处理和日志记录
- **2024-03**: 增加兼容性处理（支持新旧header格式）
