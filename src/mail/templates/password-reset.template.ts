import { escapeHtml, formatEmailTime, sanitizeEmailHeader } from './helpers';
import { renderEmailLayout } from './layout';
import { EmailBrand, EmailContent } from './types';

export function buildPasswordResetNotificationEmail(
  username: string,
  brand: EmailBrand,
  resetAt: Date = new Date(),
): EmailContent {
  const displayName = username.trim() || '用户';
  const brandName = sanitizeEmailHeader(brand.name);
  const safeBrandName = escapeHtml(brandName);
  const safeName = escapeHtml(displayName);
  const resetTime = formatEmailTime(resetAt);
  const subject = `${brandName} 密码重置通知`;
  const text = `您好 ${displayName}，您的 ${brandName} 账户密码已于 ${resetTime} 重置。如非本人操作，请立即联系管理员并保护账号。`;
  const html = renderEmailLayout({
    brand,
    title: '密码重置通知',
    preheader: `您的 ${brandName} 账户密码已完成重置`,
    content: `
      <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">您好 ${safeName}，</p>
      <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">您的 ${safeBrandName} 账户密码已完成重置。</p>
      <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin: 20px 0;">
        操作时间：<strong>${resetTime}</strong>
      </div>
      <div style="background: #fffbeb; border: 1px solid #fde68a; padding: 16px; border-radius: 8px; color: #92400e; line-height: 1.6;">
        如非本人操作，请立即联系管理员、修改密码并下线其他设备。
      </div>`,
  });

  return { subject, html, text };
}
