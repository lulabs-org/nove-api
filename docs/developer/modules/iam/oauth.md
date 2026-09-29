# OAuth 客户端管理

OAuth 客户端是平台级凭证，只能由具有对应权限的平台管理员在 `nove-admin` 的“平台治理 → OAuth 客户端”中管理。当前不支持组织自助注册，也不提供永久删除。

## 客户端类型

- `PUBLIC`：适用于 CLI、桌面或原生应用，使用 PKCE，不持有 Client Secret。
- `CONFIDENTIAL`：适用于能安全保存凭证的服务端应用。Secret 只在创建或轮换成功时返回一次，服务端仅保存哈希。

客户端类型和 Client ID 创建后不可修改。系统内置客户端（例如 `nove-cli`）在后台只读，其配置继续通过代码和 seed 管理。

## Scope 与 Redirect URI

只有启用且标记为“OAuth 可委托”的权限才能配置为 Scope。OAuth access token 的 Scope 仍会与用户当前角色权限取交集，不能扩大用户本身的授权范围。

生产环境 Redirect URI 必须使用 HTTPS；`http://127.0.0.1` loopback 是 PUBLIC 客户端本地回调的例外。URI 不支持通配符、fragment 或 userinfo。

## 生命周期与失效语义

- 禁用客户端会立即递增凭证版本、撤销全部 Refresh Token、清理授权码并终止未完成授权请求。
- OAuth API 请求会实时检查客户端状态和凭证版本，因此禁用前签发的 Access Token 会立即失效，重新启用也不会使旧 Token 恢复。
- 修改 Scope 会递增凭证版本并撤销全部 Refresh Token。
- 轮换 CONFIDENTIAL Secret 会使旧 Secret 和已有 Refresh Token 失效；新的明文 Secret 不可再次查询。

管理接口位于 `/admin/oauth-clients`，要求普通 JWT 登录，并使用 `oauth-client:*` 细粒度权限。API Key 和 OAuth 委托 Token 不能调用这些接口。
