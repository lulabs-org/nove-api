# 第三方集成

本目录描述第三方平台在 Nove 中的适配、事件处理和数据映射。厂商原始 API 文档与 Payload 样本统一放在[参考资料](../reference/index.md)。

## 会议与协作

- [腾讯会议](./tencent-meeting/overview.md)：主动 API、Webhook 验签解密和会议数据同步。
- [腾讯会议 Webhook](./tencent-meeting/webhook.md)
- [飞书](./lark/overview.md)：事件接入、多维表格和队列。
- [飞书集成现状](./lark/summary.md)

## 通知与基础服务

- [阿里云短信](./aliyun/sms-setup.md)：控制台、凭据、签名与模板配置。

邮件和短信的 Nove 业务契约分别见[邮件模块](../modules/mail/overview.md)与[短信模块](../modules/sms/overview.md)。

集成文档只描述仓库中的实现；第三方字段含义、厂商错误码和原始响应不在这里重复维护。
