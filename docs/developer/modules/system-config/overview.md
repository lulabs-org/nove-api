# 全局系统配置

`src/admin/system-config` 提供可校验、可加密并支持热更新的全局配置。目前 Registry 只注册 `mail` 和 `wechat-shop` 两个模块。

## API 与权限

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| GET | `/admin/system-config/:module` | `system:config:read` | 读取配置；未配置时返回 `null` |
| PUT | `/admin/system-config/:module` | `system:config:write` | 校验并整体合并保存 |
| DELETE | `/admin/system-config/:module` | `system:config:write` | 删除模块配置 |

未知模块返回 404。`mail` 校验 SMTP host、port、secure、user、from；`wechat-shop` 校验 appId 及可选 API 地址和回调密钥。

## 敏感字段契约

敏感字段以加密形式写入 `system_configs`：

- `mail.pass`
- `wechat-shop.appSecret`
- `wechat-shop.webhookToken`
- `wechat-shop.encodingAesKey`

GET 只返回 `********`，不会返回明文。编辑现有配置时，把 `********` 原样提交表示保留原密文；提交新字符串才会替换并重新加密。客户端不应提供“显示原密码”功能。

```json
{
  "host": "smtp.example.com",
  "port": 587,
  "secure": false,
  "user": "mailer@example.com",
  "pass": "********",
  "from": "Nove <noreply@example.com>"
}
```

## 运行时刷新

保存成功后发出 `config.<module>.updated`，删除后发出 `config.<module>.deleted`。邮件和微信小店相关服务监听事件并刷新内存配置，因此正常更新无需重启实例。多实例部署时，当前 EventEmitter 只在单进程内传播；跨实例一致性需要额外的消息机制。

数据库加密依赖应用密钥。轮换密钥前应制定兼容迁移方案并备份配置，不能直接替换后期待旧密文仍可读取。
