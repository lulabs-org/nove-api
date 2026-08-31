export type VerificationType =
  | 'register'
  | 'login'
  | 'reset_password'
  | 'security';

export function buildVerificationEmail(type: VerificationType, code: string) {
  const typeMap: Record<VerificationType, string> = {
    register: '注册',
    login: '登录',
    reset_password: '重置密码',
    security: '安全操作',
  };

  const subject = `LuLab ${typeMap[type]}验证码`;
  const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #007bff; margin: 0;">LuLab</h1>
        </div>

        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
          <h2 style="color: #333; margin-top: 0;">${typeMap[type]}验证码</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">您好，</p>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">您正在进行${typeMap[type]}操作，验证码为：</p>

          <div style="background-color: #fff; padding: 20px; text-align: center; margin: 25px 0; border-radius: 6px; border: 2px dashed #007bff;">
            <span style="font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 8px; font-family: 'Courier New', monospace;">${code}</span>
          </div>

          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="color: #856404; margin: 0; font-size: 14px;">
              <strong>⚠️ 安全提示：</strong><br>
              • 验证码有效期为 <strong>5分钟</strong>，请及时使用<br>
              • 请勿将验证码告诉他人<br>
              • 如非本人操作，请忽略此邮件
            </p>
          </div>
        </div>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px; margin: 0;">此邮件由 LuLab 系统自动发送，请勿回复</p>
          <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">© 2024 LuLab. All rights reserved.</p>
        </div>
      </div>
    `;

  return { subject, html };
}

export function buildWelcomeEmail(username: string) {
  const subject = '欢迎加入 LuLab！';
  const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #007bff; margin: 0;">LuLab</h1>
        </div>

        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
          <h2 style="color: #333; margin-top: 0;">欢迎加入 LuLab！</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">亲爱的 ${username}，</p>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">恭喜您成功注册 LuLab 账户！我们很高兴您能加入我们的社区。</p>

          <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 6px; margin: 25px 0;">
            <h3 style="color: #155724; margin-top: 0;">🎉 注册成功</h3>
            <p style="color: #155724; margin: 0; font-size: 14px;">
              您的账户已经创建完成，现在可以开始使用 LuLab 的各项功能了。
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="#" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">开始使用</a>
          </div>

          <p style="color: #666; font-size: 14px; line-height: 1.5;">如果您有任何问题或需要帮助，请随时联系我们的客服团队。</p>
        </div>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px; margin: 0;">此邮件由 LuLab 系统自动发送，请勿回复</p>
          <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">© 2024 LuLab. All rights reserved.</p>
        </div>
      </div>
    `;

  return { subject, html };
}

export function buildPasswordResetNotificationEmail(
  username: string,
  resetAt?: Date,
): { subject: string; html: string } {
  const subject = 'LuLab 密码重置通知';
  const resetTime = (resetAt ?? new Date()).toLocaleString('zh-CN');
  const safeName = username || 'User';

  const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #007bff; margin: 0;">LuLab</h1>
        </div>

        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
          <h2 style="color: #333; margin-top: 0;">密码重置通知</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">您好 ${safeName}，</p>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">您的 LuLab 账户密码已成功重置。</p>

          <div style="background-color: #fff; padding: 20px; border-radius: 6px; margin: 20px 0; border: 1px solid #e9ecef;">
            <p style="color: #333; margin: 0; font-size: 14px;">重置时间：<strong>${resetTime}</strong></p>
          </div>

          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="color: #856404; margin: 0; font-size: 14px;">
              <strong>⚠️ 安全提示：</strong><br>
              • 如果这不是您的操作，请立即联系我们并修改密码<br>
              • 建议开启两步验证以提升账户安全
            </p>
          </div>
        </div>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px; margin: 0;">此邮件由 LuLab 系统自动发送，请勿回复</p>
          <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">© 2024 LuLab. All rights reserved.</p>
        </div>
      </div>
    `;

  return { subject, html };
}

export function buildContactChangeNotificationEmail(options: {
  contactLabel: '邮箱' | '手机号';
  newContactMasked: string;
  changedAt: Date;
  recipient: 'OLD' | 'NEW';
}): { subject: string; html: string } {
  const changedAt = options.changedAt.toLocaleString('zh-CN', {
    hour12: false,
  });
  const destination = options.recipient === 'OLD' ? '原联系方式' : '新联系方式';
  const subject = `Nove 账号${options.contactLabel}变更通知`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #111827;">账号安全通知</h2>
      <p>您的 Nove 账号${options.contactLabel}已完成${options.recipient === 'OLD' ? '换绑' : '绑定验证'}。</p>
      <div style="background: #f3f4f6; padding: 16px; border-radius: 8px;">
        <p style="margin: 0 0 8px;">通知对象：${destination}</p>
        <p style="margin: 0 0 8px;">当前${options.contactLabel}：${options.newContactMasked}</p>
        <p style="margin: 0;">操作时间：${changedAt}</p>
      </div>
      <p style="color: #b45309;">如非本人操作，请立即登录安全设置修改密码并下线其他设备，或联系管理员恢复账号。</p>
      <p style="color: #6b7280; font-size: 12px;">此邮件由 Nove System 自动发送，请勿回复。</p>
    </div>
  `;
  return { subject, html };
}
