# 腾讯会议Webhook Postman测试脚本

本目录包含用于测试腾讯会议Webhook接口的Postman前置脚本。

## 文件说明

1. `tencent-meeting-webhook-postman-pre-script.js` - 用于测试Webhook URL验证（GET请求）
2. `tencent-meeting-webhook-post-event-postman-pre-script.js` - 用于测试Webhook事件接收（POST请求）

## 使用方法

### 1. 环境变量设置

在Postman中创建环境变量，设置以下变量：

```
TENCENT_MEETING_TOKEN=你的webhook_token
TENCENT_MEETING_ENCODING_AES_KEY=你的encoding_aes_key
TENCENT_MEETING_EVENT_TYPE=meeting.end (可选，默认为meeting.end)
```

### 2. 测试Webhook URL验证（GET请求）

1. 创建一个新的GET请求，URL为：`{{base_url}}/webhooks/tencent`
2. 在Params中添加：
   - Key: `check_str`, Value: `{{check_str}}`
3. 在Headers中添加：
   - Key: `timestamp`, Value: `{{timestamp}}`
   - Key: `nonce`, Value: `{{nonce}}`
   - Key: `signature`, Value: `{{signature}}`
4. 在Pre-request Script选项卡中，复制粘贴`tencent-meeting-webhook-postman-pre-script.js`的内容
5. 发送请求，预期返回解密后的验证字符串

### 3. 测试Webhook事件接收（POST请求）

1. 创建一个新的POST请求，URL为：`{{base_url}}/webhooks/tencent`
2. 在Headers中添加：
   - Key: `timestamp`, Value: `{{timestamp}}`
   - Key: `nonce`, Value: `{{nonce}}`
   - Key: `signature`, Value: `{{signature}}`
   - Key: `Content-Type`, Value: `application/json`
3. 在Body选项卡中，选择raw和JSON格式，输入：
   ```json
   {
       "data": "{{encrypted_data}}"
   }
   ```
4. 在Pre-request Script选项卡中，复制粘贴`tencent-meeting-webhook-post-event-postman-pre-script.js`的内容
5. 发送请求，预期返回`successfully received callback`

## 支持的事件类型

可以通过修改环境变量`TENCENT_MEETING_EVENT_TYPE`来测试不同的事件类型：

- `meeting.start` - 会议开始
- `meeting.end` - 会议结束
- `meeting.join` - 用户加入会议
- `meeting.leave` - 用户离开会议
- `recording.start` - 录制开始
- `recording.end` - 录制结束
- `recording.ready` - 录制文件就绪
- `meeting.update` - 会议更新
- `meeting.delete` - 会议删除
- `sub_meeting.start` - 子会议开始
- `sub_meeting.end` - 子会议结束

## 注意事项

1. 确保Postman已安装CryptoJS库（通常已内置）
2. 脚本会自动生成加密数据和签名，无需手动计算
3. 脚本会在控制台输出详细的调试信息，可在Postman Console中查看
4. 如果加密失败，请检查`encoding_aes_key`是否正确设置
5. 如果签名验证失败，请检查`token`是否正确设置

## 示例环境变量

```json
{
    "TENCENT_MEETING_TOKEN": "your_webhook_token_here",
    "TENCENT_MEETING_ENCODING_AES_KEY": "your_encoding_aes_key_here",
    "TENCENT_MEETING_EVENT_TYPE": "meeting.end",
    "base_url": "http://localhost:3000"
}
```
