import { escapeHtml, sanitizeEmailHeader } from './helpers';
import { renderEmailLayout } from './layout';
import { EmailBrand, EmailContent, VerificationEmailType } from './types';

const TYPE_LABELS: Record<VerificationEmailType, string> = {
  register: '注册',
  login: '登录',
  reset_password: '重置密码',
  security: '安全操作',
};

export function buildVerificationEmail(
  type: VerificationEmailType,
  code: string,
  brand: EmailBrand,
): EmailContent {
  const label = TYPE_LABELS[type];
  const brandName = sanitizeEmailHeader(brand.name);
  const safeCode = escapeHtml(code);
  const subject = `${brandName} ${label}验证码`;
  const text = `您正在 ${brandName} 进行${label}操作，验证码为：${code}。验证码 5 分钟内有效，请勿向他人透露。`;
  const html = renderEmailLayout({
    brand,
    title: `${label}验证码`,
    preheader: `您的${label}验证码为 ${code}`,
    content: `
      <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">您正在进行${label}操作，验证码为：</p>
      <div style="background: #f9fafb; padding: 20px; text-align: center; margin: 24px 0; border-radius: 8px; border: 2px dashed #2563eb;">
        <span style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 8px; font-family: 'Courier New', monospace;">${safeCode}</span>
      </div>
      <div style="background: #fffbeb; border: 1px solid #fde68a; padding: 16px; border-radius: 8px; color: #92400e; font-size: 14px; line-height: 1.6;">
        验证码 5 分钟内有效，请勿向他人透露。如非本人操作，请忽略此邮件。
      </div>`,
  });

  return { subject, html, text };
}
