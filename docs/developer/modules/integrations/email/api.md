# 邮件发送API使用说明

## 概述

本项目基于NestJS框架提供了完整的邮件发送服务，支持发送文本和HTML格式的邮件，包括抄送和密送功能。邮件服务使用BullMQ队列系统处理异步邮件发送任务，确保高并发场景下的性能和可靠性。

## 技术架构

- **框架**: NestJS + TypeScript
- **邮件服务**: Nodemailer
- **队列系统**: BullMQ + Redis
- **配置管理**: NestJS Config Module
- **API文档**: Swagger/OpenAPI 3.0

## 环境配置

1. 复制 `.env.example` 文件为 `.env`
2. 配置SMTP邮件服务参数：

```bash
cp .env.example .env
```

在 `.env` 文件中配置你的邮件服务信息：

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com
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

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

## 项目结构

邮件服务模块位于 `src/mail/` 目录下：

```
src/mail/
├── controllers/
│   └── mail.controller.ts    # HTTP请求处理
├── services/
│   └── mail.service.ts       # 业务逻辑
├── dto/
│   └── send-email.dto.ts     # 数据传输对象
├── decorators/
│   └── mail.decorators.ts    # Swagger文档装饰器
├── processors/
│   └── mail.processor.ts     # 队列任务处理器
└── mail.module.ts            # 模块定义
```

邮件集成模块位于 `src/integrations/email/` 目录下：

```
src/integrations/email/
├── mailer.service.ts         # Nodemailer封装服务
└── email.module.ts           # 邮件集成模块
```

配置文件位于 `src/configs/email.config.ts`。

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

### 4. 内置邮件服务方法

邮件服务还提供了一些内置方法，用于特定场景的邮件发送：

#### 发送验证码邮件

```typescript
async sendVerificationCode(
  email: string,
  code: string,
  type: 'register' | 'login' | 'reset_password'
): Promise<void>
```

#### 发送欢迎邮件

```typescript
async sendWelcomeEmail(email: string, username: string): Promise<void>
```

#### 发送简单邮件

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
import { MailService } from '@/mail/mail.service';

@Injectable()
export class UserService {
  constructor(private readonly mailService: MailService) {}

  async sendWelcomeEmail(user: User) {
    await this.mailService.sendWelcomeEmail(user.email, user.username);
  }

  async sendVerificationCode(email: string) {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    await this.mailService.sendVerificationCode(email, code, 'register');
    return code;
  }
}
```

## 启动服务

```bash
# 开发模式
pnpm run start:dev

# 生产模式
pnpm run build
pnpm run start:prod
```

服务启动后，邮件API将在 `http://localhost:3000/mail` 路径下可用。

## Swagger API文档

启动服务后，可以通过以下地址访问Swagger API文档：
- 开发环境: http://localhost:3000/api
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
   - 考虑使用邮件模板减少重复内容生成
   - 合理设置队列并发数，避免过载

7. **安全考虑**
   - 验证所有输入数据，防止注入攻击
   - 不要在日志中记录敏感信息
   - 使用HTTPS保护API通信
