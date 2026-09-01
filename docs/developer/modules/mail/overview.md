# 邮件模块

## 概述

邮件模块位于 `src/mail/`，提供文本和 HTML 邮件发送、抄送、密送、SMTP 连接检查和 BullMQ 延迟任务。`MailService` 只负责通用投递，认证邮件统一由 `AuthMailService` 选择模板并启用收件人脱敏日志。

## 技术架构

- **框架**: NestJS + TypeScript
- **邮件服务**: Nodemailer
- **队列系统**: BullMQ + Redis
- **配置管理**: 全局系统配置（数据库加密存储）
- **API文档**: Swagger/OpenAPI 3.0

## 首次配置

1. 复制 `.env.example` 文件为 `.env`
2. 配置SMTP邮件服务参数：

```bash
cp .env.example .env
```

这些环境变量只在全新数据库首次启动时导入。导入完成后，邮件配置统一在后台“平台治理 → 服务配置”中维护，运行时不再读取这些变量：

```text
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com
EMAIL_BRAND_NAME="Nove System"
EMAIL_BRAND_LOGO_URL=https://assets.example.com/nove-logo.png
EMAIL_BRAND_PRIMARY_COLOR="#2563eb"
EMAIL_BRAND_FOOTER_TEXT="此邮件由 Nove System 自动发送，请勿回复。"
EMAIL_BRAND_PUBLIC_BASE_URL=https://assets.example.com
```

### 常用邮件服务配置

#### Gmail

- 需要开启两步验证并生成应用专用密码
- SMTP_HOST: smtp.gmail.com
- SMTP_PORT: 587
- SMTP_SECURE: false

#### QQ邮箱

- 需要开启SMTP服务并获取授权码
- SMTP_HOST: smtp.qq.com
- SMTP_PORT: 587
- SMTP_SECURE: false

#### 163邮箱

- SMTP_HOST: smtp.163.com
- SMTP_PORT: 465
- SMTP_SECURE: true

### Redis配置（队列系统）

邮件服务使用BullMQ队列系统，需要配置Redis：

```text
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

## 项目结构

邮件服务模块位于 `src/mail/` 目录下：

```
src/mail/
├── mail.controller.ts            # HTTP 请求处理
├── mail.module.ts                # 模块定义
├── mail.processor.ts             # 队列任务处理器
├── services/
│   ├── auth-mail.service.ts  # 认证邮件编排
│   ├── email-brand-resolver.service.ts # 平台/组织品牌解析
│   ├── mail.service.ts       # 通用投递与队列
│   └── mailer.service.ts     # Nodemailer 封装
├── templates/
│   ├── layout.ts                         # 公共品牌布局
│   ├── helpers.ts                        # HTML 转义与时区格式化
│   ├── verification-code.template.ts     # 验证码
│   ├── welcome.template.ts               # 欢迎邮件
│   ├── password-reset.template.ts        # 密码重置通知
│   └── contact-change.template.ts        # 联系方式变更通知
├── dto/
│   └── send-email.dto.ts     # 数据传输对象
└── decorators/
    └── mail.decorators.ts    # Swagger 文档装饰器
```

Nodemailer 封装位于 `src/mail/services/mailer.service.ts`，配置文件位于 `src/configs/email.config.ts`。

## API接口

### 1. 发送邮件

**接口地址：** `POST /mail/send`

**认证要求：** 需要Bearer Token认证

**请求参数：**

```json
{
  "to": "recipient@example.com",
  "cc": ["cc1@example.com", "cc2@example.com"],
  "bcc": ["bcc1@example.com"],
  "subject": "邮件主题",
  "text": "纯文本内容",
  "html": "<h1>HTML内容</h1><p>支持HTML格式</p>"
}
```

**参数说明：**

- `to` (必填): 收件人邮箱地址，必须是有效的邮箱格式
- `cc` (可选): 抄送邮箱地址数组，每个元素必须是有效的邮箱格式
- `bcc` (可选): 密送邮箱地址数组，每个元素必须是有效的邮箱格式
- `subject` (必填): 邮件主题，字符串类型
- `text` (必填): 纯文本内容，字符串类型
- `html` (可选): HTML格式内容，字符串类型

**响应示例：**

成功响应：

```json
{
  "statusCode": 200,
  "message": "邮件发送成功",
  "data": {
    "messageId": "message-123456"
  }
}
```

失败响应：

```json
{
  "statusCode": 400,
  "message": "邮件发送失败",
  "error": "Invalid email address"
}
```

服务器错误响应：

```json
{
  "statusCode": 500,
  "message": "服务器内部错误",
  "error": "Internal server error"
}
```

### 2. 验证SMTP连接

**接口地址：** `GET /mail/verify`

**认证要求：** 无需认证（公开接口）

**响应示例：**

连接正常：

```json
{
  "statusCode": 200,
  "message": "SMTP连接正常",
  "data": {
    "connected": true
  }
}
```

连接失败：

```json
{
  "statusCode": 200,
  "message": "SMTP连接失败",
  "data": {
    "connected": false
  }
}
```

### 3. 延迟发送邮件

**接口地址：** `POST /mail/send-later`

**认证要求：** 需要Bearer Token认证

**请求参数：**

```json
{
  "email": "recipient@example.com",
  "delay": 60000
}
```

**参数说明：**

- `email` (必填): 收件人邮箱地址
- `delay` (必填): 延迟时间，单位为毫秒

**响应示例：**

```json
"已将发送 recipient@example.com 的任务加入队列，延迟 60 秒执行"
```

### 4. 认证邮件服务

认证业务应注入 `AuthMailService`，不要直接拼接 HTML 或调用模板构建函数。该服务提供以下方法：

- 未提供组织上下文时使用环境变量配置的平台默认品牌。
- 组织级业务可传入服务端可信来源的 `{ orgId }`，解析有效组织的 `name` 和 `logo`。
- `orgId` 不得直接采信匿名请求参数；组织不存在、停用或软删除时回退平台品牌。
- 组织相对 Logo 路径通过 `EMAIL_BRAND_PUBLIC_BASE_URL` 转换为 HTTPS 绝对地址，不安全地址不会渲染。

#### 发送验证码邮件

```typescript
async sendVerificationCode(
  email: string,
  code: string,
  type: 'register' | 'login' | 'reset_password' | 'security'
): Promise<void>
```

#### 发送欢迎邮件

```typescript
async sendWelcomeEmail(email: string, username: string): Promise<void>
```

此外还提供密码重置通知和联系方式变更通知。所有认证模板同时生成 HTML 与纯文本内容，对动态 HTML 值进行转义，并按 `Asia/Shanghai` 格式化安全事件时间。

#### 通用邮件投递

```typescript
async sendSimpleEmail(options: EmailOptions): Promise<void>
```

其中 `EmailOptions` 接口定义：

```typescript
interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}
```

## 使用示例

### curl 示例

```bash
# 发送简单邮件
curl -X POST http://localhost:3000/mail/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "to": "recipient@example.com",
    "subject": "测试邮件",
    "text": "这是一封测试邮件"
  }'

# 发送HTML邮件
curl -X POST http://localhost:3000/mail/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "to": "recipient@example.com",
    "cc": ["cc@example.com"],
    "subject": "HTML邮件",
    "text": "纯文本版本",
    "html": "<h1>欢迎</h1><p>这是一封<strong>HTML</strong>邮件</p>"
  }'

# 验证SMTP连接
curl http://localhost:3000/mail/verify

# 延迟发送邮件
curl -X POST http://localhost:3000/mail/send-later \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "email": "recipient@example.com",
    "delay": 60000
  }'
```

### JavaScript/TypeScript 示例

```typescript
// 发送邮件
const sendEmail = async () => {
  try {
    const response = await fetch('http://localhost:3000/mail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${yourJwtToken}`,
      },
      body: JSON.stringify({
        to: 'recipient@example.com',
        subject: '测试邮件',
        text: '这是一封测试邮件',
        html: '<h1>测试</h1><p>这是一封测试邮件</p>'
      })
    });
    
    const result = await response.json();
    console.log('邮件发送结果:', result);
  } catch (error) {
    console.error('发送失败:', error);
  }
};

// 验证连接
const verifyConnection = async () => {
  try {
    const response = await fetch('http://localhost:3000/mail/verify');
    const result = await response.json();
    console.log('连接状态:', result);
  } catch (error) {
    console.error('验证失败:', error);
  }
};

// 延迟发送邮件
const sendEmailLater = async () => {
  try {
    const response = await fetch('http://localhost:3000/mail/send-later', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${yourJwtToken}`,
      },
      body: JSON.stringify({
        email: 'recipient@example.com',
        delay: 60000 // 60秒后发送
      })
    });
    
    const result = await response.text();
    console.log('延迟发送结果:', result);
  } catch (error) {
    console.error('延迟发送失败:', error);
  }
};
```

### NestJS 中使用邮件服务

```typescript
import { AuthMailService } from '@/mail/services/auth-mail.service';

@Injectable()
export class UserService {
  constructor(private readonly authMailService: AuthMailService) {}

  async sendWelcomeEmail(user: User) {
    await this.authMailService.sendWelcomeEmail(user.email, user.username);
  }

  async sendOrganizationWelcomeEmail(user: User, trustedOrgId: string) {
    await this.authMailService.sendWelcomeEmail(user.email, user.username, {
      orgId: trustedOrgId,
    });
  }

  async sendVerificationCode(email: string, code: string) {
    await this.authMailService.sendVerificationCode(email, code, 'register');
  }
}
```

验证码必须由认证模块现有的安全随机数与持久化流程生成，不要在邮件调用方临时生成。

## 启动服务

```bash
# 开发模式
pnpm run start:dev

# 生产模式
pnpm run build
pnpm run start:prod
```

服务启动后，邮件 API 在 `http://localhost:3000/mail` 路径下可用。

## Swagger API文档

启动服务后，可以通过以下地址访问Swagger API文档：
- 开发环境 Swagger：`http://localhost:3000/api`
- 生产环境: http://your-domain/api

在Swagger文档中，你可以：
- 查看所有API接口的详细说明
- 在线测试API接口
- 查看请求/响应示例
- 了解认证要求

## 队列系统监控

邮件服务使用BullMQ队列系统，可以通过以下方式监控队列状态：

```bash
# 查看Redis中的队列状态
redis-cli
> KEYS bull:mail:*
> LLEN bull:mail:waiting
> LLEN bull:mail:active
```

## 注意事项

1. **环境配置**
   - 确保SMTP服务配置正确
   - 某些邮件服务商需要开启SMTP服务并获取专用密码
   - 建议在生产环境中使用环境变量管理敏感信息

2. **认证要求**
   - 大部分API接口需要JWT Bearer Token认证
   - 只有验证SMTP连接接口是公开的

3. **队列系统**
   - 确保Redis服务正常运行
   - 队列任务失败会自动重试（可配置重试次数和延迟）
   - 监控队列状态，避免任务积压

4. **邮件发送限制**
   - 注意邮件发送频率限制，避免被标记为垃圾邮件
   - 建议使用延迟发送功能分散发送时间
   - 大量邮件发送建议使用队列批处理

5. **错误处理**
   - 建议添加适当的错误处理和日志记录
   - 监控邮件发送失败率
   - 设置邮件发送失败的告警机制

6. **性能优化**
   - 对于大量邮件发送，使用队列系统避免阻塞主线程
   - 认证邮件复用 `src/mail/templates` 中的公共布局和模板
   - 合理设置队列并发数，避免过载

7. **安全考虑**
   - 验证所有输入数据，防止注入攻击
   - 不要在日志中记录敏感信息
   - 使用HTTPS保护API通信
