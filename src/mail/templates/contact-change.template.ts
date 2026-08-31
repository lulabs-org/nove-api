import { escapeHtml, formatEmailTime, sanitizeEmailHeader } from './helpers';
import { renderEmailLayout } from './layout';
import { ContactChangeEmailOptions, EmailBrand, EmailContent } from './types';

export function buildContactChangeNotificationEmail(
  options: ContactChangeEmailOptions,
  brand: EmailBrand,
): EmailContent {
  const changedAt = formatEmailTime(options.changedAt);
  const brandName = sanitizeEmailHeader(brand.name);
  const safeBrandName = escapeHtml(brandName);
  const contact = escapeHtml(options.newContactMasked);
  const destination = options.recipient === 'OLD' ? '原联系方式' : '新联系方式';
  const action = options.recipient === 'OLD' ? '换绑' : '绑定验证';
  const subject = `${brandName} 账号${options.contactLabel}变更通知`;
  const text = `您的 ${brandName} 账号${options.contactLabel}已完成${action}。当前${options.contactLabel}：${options.newContactMasked}，操作时间：${changedAt}。如非本人操作，请立即保护账号。`;
  const html = renderEmailLayout({
    brand,
    title: '账号安全通知',
    preheader: `您的账号${options.contactLabel}已完成${action}`,
    content: `
      <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">您的 ${safeBrandName} 账号${options.contactLabel}已完成${action}。</p>
      <div style="background: #f9fafb; padding: 16px; border-radius: 8px; line-height: 1.8;">
        <div>通知对象：${destination}</div>
        <div>当前${options.contactLabel}：${contact}</div>
        <div>操作时间：${changedAt}</div>
      </div>
      <p style="color: #b45309; line-height: 1.6;">如非本人操作，请立即登录安全设置修改密码并下线其他设备，或联系管理员恢复账号。</p>`,
  });

  return { subject, html, text };
}
