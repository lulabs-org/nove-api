# 第三方集成与消息通道

本目录系统描述第三方协同办公平台、外部服务集成中心及消息推送通道在 Nove 中的技术架构、事件流转与数据映射。第三方厂商的最新开放平台协议与鉴权规范建议直接查阅对应厂商官方开发者文档。

## 🔐 动态服务集成中心

- [管理后台配置指南](./service-integrations.md)：腾讯会议、微信小店、企业微信、飞书、AI 模型、文件扫描及邮件等所有动态集成服务的字段说明与后台操作。
- [服务集成后端架构](./architecture.md)：数据库加密驱动（`system_configs`）、AES-256-GCM 脱敏掩码与基于事件的运行时热重载设计。

## 🤝 协同办公生态集成

- **腾讯会议**：
  - [集成总览](./tencent-meeting/overview.md)：主动 OpenAPI 调用、云录制同步与生命周期监听。
  - [Webhook 处理](./tencent-meeting/webhook.md)：腾讯会议回调验签与 AES-CBC 解密规范。
  - [本地联调与测试](./tencent-meeting/webhook-testing.md)：Postman 与 Jest 集成测试模拟指引。
- **企业微信 (WeCom)**：
  - [企业微信与 Hermes 机器人](./wecom/overview.md)：Hermes 网关通信、消息事件解密与大模型交互。
- **飞书 (Lark)**：
  - [集成总览](./lark/overview.md)：视频会议 (VC) 事件监听与云录制文件拉取。
  - [Webhook 集成](./lark/webhook.md)：统一回调端点（`POST /webhooks/lark`）与 Challenge 验证。

## 📨 消息通知与通信通道

- [邮件通知服务 (Mail)](./messaging/mail.md)：Nodemailer 封装、认证邮件模板体系、品牌解析与 BullMQ 延迟队列。
- [短信基础服务 (SMS)](./messaging/sms.md)：验证码类型分发、频率限制与模块调用契约。
- [阿里云短信接入配置](./messaging/aliyun-sms.md)：阿里云控制台申请、签名/模板审核及 RAM 凭据配置。

---

> 商业交易与微信小店业务流参见[商业与交易域](../modules/commerce/overview.md)。
