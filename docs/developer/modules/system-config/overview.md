# 全局系统配置

`src/admin/system-config` 提供可校验、可加密并支持热更新的全局服务配置。Registry 注册邮件、AI、腾讯会议、飞书和微信小店五个模块。

## 首次环境导入

API 在首次启动、进入 Nest 生命周期钩子前，把已有数据库值、服务环境变量和非敏感默认值合并成数据库快照。数据库字段优先，环境变量只补缺失字段；敏感字段使用 `SYSTEM_ENCRYPTION_KEY` 加密。

迁移在一个 Serializable 事务内执行，并最后写入 `SYSTEM_CONFIG_ENV_IMPORT_V1` 标记。标记只保存导入时间、字段名和完整状态，不保存配置值。标记存在后，运行时完全忽略这些服务环境变量；删除后台配置也不会在重启后重新导入。

首次部署应保留原服务环境变量并确认导入成功。完成连接测试后，可从部署环境移除 SMTP、AI、腾讯会议、飞书和微信小店密钥，但必须长期、稳定地保留 `SYSTEM_ENCRYPTION_KEY`。数据库、Redis、JWT 等部署基础设施配置仍由环境变量或 Secret 管理平台维护。

## API 与权限

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| GET | `/admin/system-config` | `system:config:read` | 返回五个模块的配置状态 |
| GET | `/admin/system-config/:module` | `system:config:read` | 返回掩码后的有效配置与初始化元数据 |
| PUT | `/admin/system-config/:module` | `system:config:write` | 校验并合并保存 |
| DELETE | `/admin/system-config/:module` | `system:config:write` | 删除数据库配置，不恢复环境变量 |
| POST | `/admin/system-config/:module/test` | `system:config:write` | 使用当前草稿测试连接，不持久化 |

配置来源只会是 `database` 或 `default`。数据库记录存在但必填字段不足时，`source` 仍为 `database`，`configured` 为 `false`。`environmentImportedAt` 和 `environmentImportedFields` 只描述历史导入，不包含原始值。

## 敏感字段契约

敏感字段以 AES-256-GCM 密文写入 `system_configs`，包括邮件密码、AI API Key、腾讯会议 Secret ID/Secret Key/Webhook 密钥、飞书应用与事件密钥，以及微信小店密钥。

GET 只返回 `********`。编辑现有配置时，原样提交 `********` 或留空表示保留原密文；提交新字符串才会替换并重新加密。客户端不提供“显示原密码”功能。

## 运行时刷新

保存成功后发出 `config.<module>.updated`，删除后发出 `config.<module>.deleted`。邮件、AI、腾讯会议、飞书 HTTP/多维表格和微信小店消费者会刷新内存配置。飞书 App ID 或 App Secret 变化后，HTTP 客户端立即生效，事件长连接需重启 API。

多实例部署时，当前 EventEmitter 只在单进程内传播；跨实例配置更新需要逐实例重启或后续引入共享消息机制。轮换 `SYSTEM_ENCRYPTION_KEY` 前必须先重加密历史数据并备份配置，不能直接替换密钥。
