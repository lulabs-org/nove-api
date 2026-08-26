# Lark（飞书） Webhook 集成指南

本文档详细说明如何在项目中集成和配置 Lark（飞书） Webhook，实现会议事件的实时处理。

> 命名统一：主路由为 `/webhooks/lark`，保留兼容别名 `/webhooks/feishu`。

## 功能特性

- ✅ 基于飞书服务端SDK实现的事件处理
- ✅ 完整的签名验证机制
- ✅ 支持多种会议事件类型
- ✅ 数据加密和解密支持
- ✅ 自动事件分发和处理
- ✅ 完善的日志记录

## 支持的飞书事件类型

| 事件类型 | 描述 | 触发时机 |
|---------|------|----------|
| `vc.meeting.started_v1` | 会议开始 | 会议创建并开始时 |
| `vc.meeting.all_meeting_ended_v1` | 会议结束 | 所有参会者离开会议时 |
| `vc.meeting.recording_ready_v1` | 录制完成 | 会议录制文件生成完成时 |
| `vc.meeting.participant_joined_v1` | 参会者加入 | 用户加入会议时 |
| `vc.meeting.participant_left_v1` | 参会者离开 | 用户离开会议时 |

## 配置步骤

### 1. 环境变量配置

在 `.env` 文件中添加以下配置：

```bash
# 飞书Webhook配置
FEISHU_ENCRYPT_KEY=your_feishu_encrypt_key
FEISHU_VERIFICATION_TOKEN=your_feishu_verification_token
```

### 2. 获取配置值

#### 从飞书开放平台获取配置

1. 登录 [飞书开放平台](https://open.feishu.cn/)
2. 进入应用详情页 → 事件订阅
3. 获取以下信息：
   - **Encrypt Key**: 用于数据加密/解密
   - **Verification Token**: 用于签名验证

#### 配置Webhook URL

在飞书开放平台配置以下URL：

- **事件订阅URL**: `https://your-domain.com/webhooks/lark/event`
- **验证URL**: `https://your-domain.com/webhooks/lark/verify`

### 3. API端点说明

#### 事件接收端点

```http
POST /webhooks/lark/event
Content-Type: application/json
X-Lark-Signature: sha256=xxx
X-Lark-Request-Timestamp: 1630000000
X-Lark-Request-Nonce: random_string

{
  "type": "event_callback",
  "event": {
    "type": "vc.meeting.started_v1",
    "meeting_id": "meeting_123",
    "topic": "项目讨论会议",
    "host_user_id": "user_123"
  },
  "token": "verification_token",
  "ts": 1630000000,
  "uuid": "unique_uuid"
}
```

#### URL验证端点

```http
GET /webhooks/lark/verify?challenge=challenge_string

响应：
{
  "challenge": "challenge_string"
}
```

## 使用示例

### 处理会议开始事件

```typescript
// 在FeishuWebhookHandler中自定义业务逻辑
private async handleMeetingStarted(data: any): Promise<void> {
    const meetingData = data.event as FeishuMeetingEvent;
    
    // 1. 更新数据库中的会议状态
    await this.prisma.meeting.update({
        where: { feishuMeetingId: meetingData.meeting_id },
        data: { 
            status: 'IN_PROGRESS',
            startedAt: new Date(meetingData.start_time)
        }
    });
    
    // 2. 发送会议开始通知
    await this.notificationService.sendMeetingStarted(meetingData);
    
    this.logger.log(`会议 ${meetingData.topic} 已开始`);
}
```

### 处理录制完成事件

```typescript
private async handleRecordingReady(data: any): Promise<void> {
    const recordFiles = data.event.record_files as FeishuRecordFile[];
    
    for (const file of recordFiles) {
        // 1. 下载录制文件
        const downloadUrl = await this.getDownloadUrl(file.file_id);
        
        // 2. 保存录制文件信息到数据库
        await this.prisma.recordingFile.create({
            data: {
                fileId: file.file_id,
                fileName: file.file_name,
                fileSize: file.file_size,
                duration: file.duration,
                downloadUrl: downloadUrl,
                meetingId: data.event.meeting_id
            }
        });
        
        // 3. 发送录制完成通知
        await this.notificationService.sendRecordingReady(file);
    }
}
```

## 开发调试

### 本地测试

1. **启动应用**:

   ```bash
   pnpm start:dev
   ```

2. **测试配置**:

   ```bash
   # 访问测试端点
   curl http://localhost:3000/webhooks/lark/verify?challenge=test_challenge
   
   # 预期响应: {"challenge":"test_challenge"}
   ```

3. **使用飞书测试工具**:
   - 在飞书开放平台使用"测试事件推送"功能
   - 验证事件是否能正确接收和处理

### 日志查看

应用会自动记录以下日志：

- 事件接收和验证日志
- 事件处理成功/失败日志
- 错误详情和堆栈信息

## 安全考虑

### 1. 签名验证

- 所有Webhook请求都会验证签名
- 使用HMAC-SHA256算法确保数据完整性
- 时间戳验证防止重放攻击

### 2. 数据加密

- 支持AES-256-CBC数据加密
- 敏感信息在传输过程中加密
- 可配置跳过验证用于开发环境

### 3. 访问控制

- 建议配置HTTPS
- 限制IP白名单（飞书服务器IP段）
- 使用环境变量存储敏感配置

## 故障排除

### 常见问题

#### 1. 签名验证失败

```bash
# 检查配置
FEISHU_ENCRYPT_KEY=your_correct_encrypt_key
FEISHU_VERIFICATION_TOKEN=your_correct_token

# 验证密钥格式
# Encrypt Key应为Base64编码的32字节密钥
```

#### 2. 事件未触发

- 确认Webhook URL配置正确
- 检查应用是否有对应事件的权限
- 查看应用日志确认事件接收情况

#### 3. 事件处理超时

- 确保事件处理逻辑异步执行
- 对于耗时操作使用消息队列
- 配置合理的超时时间

### 调试工具

可以使用以下工具进行调试：

1. **飞书开放平台测试工具**
2. **Postman/Webhook.site**
3. **本地日志查看**
4. **飞书开发者社区**

## 相关资源

- [飞书服务端SDK文档](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/server-side-sdk/nodejs-sdk/preparation-before-development)
- [飞书Webhook事件文档](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/vc-v1/meeting/events)
- [飞书开放平台](https://open.feishu.cn/)
