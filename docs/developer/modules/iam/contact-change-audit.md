# 联系方式换绑审计与通知

邮箱和手机号绑定或换绑会在同一数据库事务中更新用户、消费验证码、写入 `user_security_audit_logs`、创建 `security_notification_outbox`，并撤销当前设备之外的刷新会话。通知供应商故障不会回滚已经完成的换绑。

## 部署配置

```bash
SYSTEM_ENCRYPTION_KEY=<至少 32 字节并长期稳定保管的密钥>
SYSTEM_ENCRYPTION_KEY_VERSION=v1
ALIYUN_SMS_TEMPLATE_SECURITY_CHANGE=SMS_xxxxxxxxx
```

- `SYSTEM_ENCRYPTION_KEY` 使用 AES-256-GCM 加密新旧联系方式。生产环境轮换密钥前必须先重加密历史记录。
- `SYSTEM_ENCRYPTION_KEY_VERSION` 会写入每条审计记录，用于标识生成密文的密钥版本。
- `ALIYUN_SMS_TEMPLATE_SECURITY_CHANGE` 必须是与签名匹配并审核通过的正式通知模板，参数为 `contactType` 和 `changedAt`。

数据库迁移必须先于应用发布。应用启动时会校验审计加密密钥；密钥缺失或不足 32 字节时拒绝启动。

## 运维检查

`security_notification_outbox` 的 `PENDING`、`PROCESSING`、`SENT`、`FAILED` 状态可用于监控投递情况。处理器每分钟扫描待发送任务，首次失败后最多重试 5 次；日志只包含 Outbox ID、尝试次数和脱敏错误代码，不记录完整邮箱、手机号或密文。

审计记录不通过用户或管理员 API 暴露。软删除用户不会删除审计；物理删除用户时数据库外键会级联清理审计和 Outbox。
