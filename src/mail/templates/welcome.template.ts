import { escapeHtml, sanitizeEmailHeader } from './helpers';
import { renderEmailLayout } from './layout';
import { EmailBrand, EmailContent } from './types';

export function buildWelcomeEmail(
  username: string,
  brand: EmailBrand,
): EmailContent {
  const displayName = username.trim() || '用户';
  const brandName = sanitizeEmailHeader(brand.name);
  const safeBrandName = escapeHtml(brandName);
  const safeName = escapeHtml(displayName);
  const subject = `欢迎加入 ${brandName}！`;
  const text = `您好 ${displayName}，您的 ${brandName} 账户已创建成功。`;
  const html = renderEmailLayout({
    brand,
    title: `欢迎加入 ${brandName}！`,
    preheader: `您的 ${brandName} 账户已创建成功`,
    content: `
      <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">您好 ${safeName}，</p>
      <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">您的 ${safeBrandName} 账户已创建成功，现在可以开始使用系统功能。</p>
      <div style="background: #ecfdf5; border: 1px solid #a7f3d0; padding: 16px; border-radius: 8px; color: #065f46; margin-top: 24px;">
        注册成功，请妥善保管您的登录凭据。
      </div>`,
  });

  return { subject, html, text };
}
