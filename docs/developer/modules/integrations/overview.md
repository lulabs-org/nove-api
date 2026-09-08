# 全局系统配置

`src/admin/system-config` 提供可校验、可加密并支持热更新的全局服务配置。Registry 注册邮件、AI、腾讯会议、飞书和微信小店五个模块。

## 配置存储与生效模型

第三方业务服务配置（邮件、AI、腾讯会议、飞书、微信小店）完全由数据库（`system_configs` 表）驱动并按组织（Organization）隔离。运行时**不会读取或回退到环境变量**，生效配置规则为：
$$\text{代码非敏感默认值 (兜底)} \to \text{数据库存储值 (最高优)}$$

* **基础设施配置**：数据库、Redis、JWT 密钥及 `SYSTEM_ENCRYPTION_KEY` 仍由部署环境变量或 Secret 管理平台维护。
* **业务集成配置**：所有第三方服务的凭证与参数统一在 Nove Admin 后台录入与管理。敏感字段入库时使用 `SYSTEM_ENCRYPTION_KEY` 进行 AES-256-GCM 加密，未配置时服务优雅降级。

## API 与权限

控制器路由统一为 `/admin/integrations`，在 Swagger 文档中分组为 **`Admin / Integrations`**。

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| GET | `/admin/integrations` | `system:config:read` | 返回五个集成模块的配置状态 |
| GET | `/admin/integrations/:module` | `system:config:read` | 返回掩码后的有效配置 |
| PUT | `/admin/integrations/:module` | `system:config:write` | 校验并合并保存 |
| DELETE | `/admin/integrations/:module` | `system:config:write` | 删除数据库配置，退回默认未配置状态 |
| POST | `/admin/integrations/:module/test` | `system:config:write` | 使用当前草稿测试连接，不持久化 |

配置来源只会是 `database` 或 `default`。数据库记录存在但必填字段不足时，`source` 仍为 `database`，`configured` 为 `false`。

## 敏感字段契约

敏感字段以 AES-256-GCM 密文写入 `system_configs`，包括邮件密码、AI API Key、腾讯会议 Secret ID/Secret Key/Webhook 密钥、飞书应用与事件密钥，以及微信小店密钥。

GET 只返回 `********`。编辑现有配置时，原样提交 `********` 或留空表示保留原密文；提交新字符串才会替换并重新加密。客户端不提供“显示原密码”功能。

## 运行时刷新

保存成功后发出 `config.<module>.updated`，删除后发出 `config.<module>.deleted`。邮件、AI、腾讯会议、飞书 HTTP/多维表格和微信小店消费者会刷新内存配置。飞书 App ID 或 App Secret 变化后，HTTP 客户端立即生效，事件长连接需重启 API。

多实例部署时，当前 EventEmitter 只在单进程内传播；跨实例配置更新需要逐实例重启或后续引入共享消息机制。轮换 `SYSTEM_ENCRYPTION_KEY` 前必须先重加密历史数据并备份配置，不能直接替换密钥。
