# 用户注册流程说明

## 概述

为了提高账户安全性，我们已经更新了用户注册流程。现在所有用户注册都必须通过邮箱或手机号验证码进行验证。

## 支持的注册方式

### 1. 邮箱验证码注册 (推荐)

**步骤：**

1. 发送验证码到邮箱
2. 使用邮箱和验证码完成注册

**API调用示例：**

```bash
# 1. 发送验证码
POST /api/auth/otp/send-email-code
{
  "target": "user@example.com",
  "type": "register"
}

# 2. 注册用户
POST /api/auth/register
{
  "type": "email_code",
  "email": "user@example.com",
  "code": "123456",
  "username": "myusername",  // 可选
  "password": "MyPassword123"  // 可选，如果不设置密码，用户只能通过验证码登录
}
```

### 2. 手机验证码注册

**步骤：**

1. 发送验证码到手机号
2. 使用手机号和验证码完成注册

**API调用示例：**

```bash
# 1. 发送验证码
POST /api/auth/otp/send-phone-code
{
  "target": "13800138000",
  "type": "register",
  "countryCode": "+86"
}

# 2. 注册用户
POST /api/auth/register
{
  "type": "phone_code",
  "phone": "13800138000",
  "countryCode": "+86",
  "code": "123456",
  "username": "myusername",  // 可选
  "password": "MyPassword123"  // 可选
}
```

## 已禁用的注册方式

以下注册方式已被禁用，以提高安全性：

- ❌ `username_password` - 纯用户名密码注册
- ❌ `email_password` - 邮箱密码注册（未验证邮箱）
- ❌ `phone_password` - 手机密码注册（未验证手机号）

## 注册后的状态

- 通过邮箱验证码注册的用户，邮箱将自动标记为已验证
- 通过手机验证码注册的用户，手机号将自动标记为已验证
- 用户可以选择设置密码，也可以仅使用验证码登录

## 错误处理

如果尝试使用已禁用的注册方式，将收到以下错误信息：

```json
{
  "statusCode": 400,
  "message": "为了账户安全，注册需要邮箱或手机号验证，请使用邮箱验证码或手机验证码注册"
}
```

## 登录方式

注册成功后，用户可以使用以下方式登录：

1. **邮箱 + 密码**（如果设置了密码）
2. **邮箱 + 验证码**
3. **手机号 + 密码**（如果设置了密码）
4. **手机号 + 验证码**
5. **用户名 + 密码**（如果设置了用户名和密码）

## 迁移指南

如果您的应用当前使用 `username_password` 注册方式，请更新为：

1. 要求用户提供邮箱或手机号
2. 发送验证码进行验证
3. 使用 `email_code` 或 `phone_code` 类型注册

这样可以确保所有注册用户都有经过验证的联系方式，提高账户安全性和可恢复性。
