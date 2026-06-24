# 认证 API

认证模块负责系统的用户注册、登录授权以及令牌管理。所有受保护的端点都要求在 HTTP 头部携带 `Authorization: Bearer <JWT_TOKEN>`。

## 核心端点概览

| 端点 | 方法 | 说明 | 鉴权要求 |
|------|------|------|---------|
| `/auth/register` | `POST` | 用户注册 (支持验证码校验) | 否 |
| `/auth/login` | `POST` | 用户登录，获取访问和刷新令牌 | 否 |
| `/auth/refresh` | `POST` | 使用刷新令牌换取新的访问令牌 | 否 (需 RefreshToken) |
| `/auth/logout` | `POST` | 退出登录，注销当前令牌 | 是 |
| `/auth/password/reset` | `POST` | 忘记密码或重置密码 | 否 |

> **提示**: 关于完整的请求参数 (DTO) 和响应格式，请在本地启动项目后访问 `/api` (Swagger UI) 查看详细的交互式文档。
