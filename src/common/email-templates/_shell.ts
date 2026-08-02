/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Description: 邮件模板共享基础设施（HTML 转义 + 外壳布局）
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

/**
 * HTML 转义，防止 XSS。
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 构造邮件 HTML 外壳（LuLab 品牌样式）。
 * @param title 邮件标题（会显示在 <h2>）
 * @param innerHtml 邮件正文 HTML（已转义的内容）
 */
export function buildEmailShell(
  title: string,
  innerHtml: string,
): { subject: string; html: string } {
  const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #007bff; margin: 0;">LuLab</h1>
        </div>

        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
          <h2 style="color: #333; margin-top: 0;">${escapeHtml(title)}</h2>
          ${innerHtml}
        </div>

        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px; margin: 0;">此邮件由 LuLab 系统自动发送，请勿回复</p>
          <p style="color: #999; font-size: 12px; margin: 5px 0 0 0;">© 2026 LuLab. All rights reserved.</p>
        </div>
      </div>
    `;
  return { subject: title, html };
}
