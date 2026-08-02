/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Description: 欢迎注册邮件模板
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { escapeHtml, buildEmailShell } from './_shell';

export function buildWelcomeEmail(username: string) {
  const subject = '欢迎加入 LuLab！';
  const safeName = escapeHtml(username);

  const innerHtml = `
          <p style="color: #666; font-size: 16px; line-height: 1.5;">亲爱的 ${safeName}，</p>
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
        `;

  return buildEmailShell(subject, innerHtml);
}
