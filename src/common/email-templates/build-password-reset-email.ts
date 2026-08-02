/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Description: 密码重置通知邮件模板
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { escapeHtml, buildEmailShell } from './_shell';

export function buildPasswordResetNotificationEmail(
  username: string,
  resetAt?: Date,
): { subject: string; html: string } {
  const subject = 'LuLab 密码重置通知';
  const resetTime = (resetAt ?? new Date()).toLocaleString('zh-CN');
  const safeName = escapeHtml(username || 'User');

  const innerHtml = `
          <p style="color: #666; font-size: 16px; line-height: 1.5;">您好 ${safeName}，</p>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">您的 LuLab 账户密码已成功重置。</p>

          <div style="background-color: #fff; padding: 20px; border-radius: 6px; margin: 20px 0; border: 1px solid #e9ecef;">
            <p style="color: #333; margin: 0; font-size: 14px;">重置时间：<strong>${escapeHtml(resetTime)}</strong></p>
          </div>

          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="color: #856404; margin: 0; font-size: 14px;">
              <strong>⚠️ 安全提示：</strong><br>
              • 如果这不是您的操作，请立即联系我们并修改密码<br>
              • 建议开启两步验证以提升账户安全
            </p>
          </div>
        `;

  return buildEmailShell(subject, innerHtml);
}
