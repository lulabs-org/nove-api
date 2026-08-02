/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Description: 验证码邮件模板
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { escapeHtml, buildEmailShell } from './_shell';

export type VerificationType = 'register' | 'login' | 'reset_password';

export function buildVerificationEmail(type: VerificationType, code: string) {
  const typeMap: Record<VerificationType, string> = {
    register: '注册',
    login: '登录',
    reset_password: '重置密码',
  };

  const subject = `LuLab ${typeMap[type]}验证码`;
  const safeCode = escapeHtml(code);

  const innerHtml = `
          <p style="color: #666; font-size: 16px; line-height: 1.5;">您好，</p>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">您正在进行${typeMap[type]}操作，验证码为：</p>

          <div style="background-color: #fff; padding: 20px; text-align: center; margin: 25px 0; border-radius: 6px; border: 2px dashed #007bff;">
            <span style="font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 8px; font-family: 'Courier New', monospace;">${safeCode}</span>
          </div>

          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="color: #856404; margin: 0; font-size: 14px;">
              <strong>⚠️ 安全提示：</strong><br>
              • 验证码有效期为 <strong>5分钟</strong>，请及时使用<br>
              • 请勿将验证码告诉他人<br>
              • 如非本人操作，请忽略此邮件
            </p>
          </div>
        `;

  return buildEmailShell(subject, innerHtml);
}
