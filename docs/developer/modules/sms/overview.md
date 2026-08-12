# 短信模块

## 概述

`SmsModule` 位于 `src/sms/`，向其他 NestJS 模块导出 `SmsService`。它负责把手机号、验证码类型和验证码转换为短信供应商请求，目前使用阿里云短信。

供应商控制台、凭据、签名和模板的准备步骤见[阿里云短信配置](../../integrations/aliyun/sms-setup.md)。

## 模块边界

```text
VerificationController
  └── VerificationService
      ├── VerificationRepository
      ├── MailService
      └── SmsService
          └── 阿里云短信 API
```

- `VerificationService` 生成和持久化验证码，并执行目标与 IP 频率限制。
- `SmsService` 根据 `register`、`login` 或 `reset_password` 选择阿里云模板，发送短信并检查供应商响应。
- `SmsModule` 本身不声明 HTTP Controller；对外的验证码接口由 `VerificationController` 提供。

## 配置

`src/configs/aliyun.config.ts` 读取以下环境变量：

```text
ALIYUN_SMS_SIGN_NAME
ALIYUN_SMS_TEMPLATE_REGISTER
ALIYUN_SMS_TEMPLATE_LOGIN
ALIYUN_SMS_TEMPLATE_RESET
```

阿里云 SDK 通过标准凭据链读取 `ALIBABA_CLOUD_ACCESS_KEY_ID` 和 `ALIBABA_CLOUD_ACCESS_KEY_SECRET`。不要将 AccessKey 写入代码、文档示例或日志。

## 调用方式

业务模块一般通过 `VerificationService` 发送验证码。对外路由为：

```http
POST /api/auth/otp/send
POST /api/auth/otp/verify
```

`POST /api/auth/otp/send` 根据 `target` 的格式选择邮件或短信通道；手机号可通过 `countryCode` 附加国家或地区代码。完整请求和响应字段以运行中的 Swagger 文档为准。

## 错误处理

`SmsService` 会将阿里云非 `OK` 响应视为发送失败，`VerificationService` 再将其转换为面向 API 调用方的错误。排障时可记录供应商错误码和请求 ID，但不应记录 AccessKey、完整手机号或验证码。
