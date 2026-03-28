# 阿里云短信服务配置指南

本项目已集成阿里云短信服务，用于发送验证码短信。以下是配置和使用指南。

## 前置条件

1. 拥有阿里云账号
2. 开通短信服务
3. 申请短信签名和模板

## 配置步骤

### 1. 阿里云控制台配置

#### 1.1 开通短信服务

- 登录[阿里云控制台](https://ecs.console.aliyun.com/)
- 搜索并进入「短信服务」
- 开通短信服务

#### 1.2 申请短信签名

- 在短信服务控制台，进入「国内消息」->「签名管理」
- 点击「添加签名」
- 填写签名名称（如：视算新里程科技）
- 选择签名来源和用途
- 上传相关资质证明
- 提交审核（通常1-2个工作日）

#### 1.3 申请短信模板

- 在短信服务控制台，进入「国内消息」->「模板管理」
- 点击「添加模板」
- 选择模板类型：验证码
- 填写模板内容，例如：

  ```text

  您的验证码是${code}，5分钟内有效，请勿泄露给他人。
  ```

- 提交审核（通常1-2个工作日）

#### 1.4 创建AccessKey（推荐使用RAM用户）

- 进入「访问控制RAM」控制台
- 创建RAM用户，仅勾选「编程访问」
- 为RAM用户添加权限：`AliyunDysmsFullAccess`
- 创建AccessKey并保存

### 2. 项目配置

#### 2.1 环境变量配置

复制 `.env.example` 为 `.env`，并配置以下变量：

```bash
# 阿里云短信服务配置
# 阿里云凭证库使用的标准环境变量名称
ALIBABA_CLOUD_ACCESS_KEY_ID=your-access-key-id
ALIBABA_CLOUD_ACCESS_KEY_SECRET=your-access-key-secret

# 阿里云短信签名（审核通过的签名名称）
ALIYUN_SMS_SIGN_NAME=视算新里程科技

# 阿里云短信模板代码（审核通过的模板代码）
ALIYUN_SMS_TEMPLATE_REGISTER=SMS_271525576
ALIYUN_SMS_TEMPLATE_LOGIN=SMS_271525576
ALIYUN_SMS_TEMPLATE_RESET=SMS_271525576
```

#### 2.2 安全配置建议

**生产环境强烈建议使用以下安全配置方式之一：**

1. **RAM角色（推荐）**：
   - 为ECS实例配置RAM角色
   - 无需在代码中配置AccessKey
   - 参考：[使用实例RAM角色访问其他云产品](https://help.aliyun.com/document_detail/54579.html)

2. **STS临时凭证**：
   - 使用STS服务获取临时访问凭证
   - 定期自动刷新凭证
   - 参考：[STS临时访问凭证](https://help.aliyun.com/document_detail/28756.html)

3. **环境变量**：
   - 将AccessKey配置在环境变量中
   - 不要将AccessKey写入代码或配置文件

## 使用方法

### API调用示例

发送注册验证码：

```bash
POST /auth/send-code
Content-Type: application/json

{
  "target": "13800138000",
  "type": "register"
}
```

发送登录验证码：

```bash
POST /auth/send-code
Content-Type: application/json

{
  "target": "13800138000",
  "type": "login"
}
```

### 验证码验证

```bash
POST /auth/verify-code
Content-Type: application/json

{
  "target": "13800138000",
  "code": "123456",
  "type": "register"
}
```

## 费用说明

- 国内短信：约0.045元/条
- 国际短信：价格因地区而异
- 建议设置费用预警和限额

## 限制说明

- 同一手机号1小时内最多发送5条验证码
- 同一IP地址1天内最多发送20条验证码
- 验证码有效期：5分钟
- 验证码长度：6位数字

## 故障排查

### 常见错误

1. **签名不合法**：
   - 检查签名是否审核通过
   - 确认签名名称配置正确

2. **模板不存在**：
   - 检查模板代码是否正确
   - 确认模板已审核通过

3. **余额不足**：
   - 检查阿里云账户余额
   - 充值或设置自动充值

4. **权限不足**：
   - 检查AccessKey权限
   - 确认RAM用户有短信发送权限

### 日志查看

应用日志会记录短信发送的详细信息：

```bash
# 查看应用日志
npm run start:dev

# 成功日志示例
[AliyunSmsService] 短信发送成功: 13800138000, 验证码: 123456

# 失败日志示例
[AliyunSmsService] 短信发送失败: SignatureDoesNotMatch
```

## 相关链接

- [阿里云短信服务文档](https://help.aliyun.com/product/44282.html)
- [短信服务API参考](https://help.aliyun.com/document_detail/101414.html)
- [凭据配置指南](https://help.aliyun.com/document_detail/378664.html)
- [短信服务控制台](https://dysms.console.aliyun.com/)
