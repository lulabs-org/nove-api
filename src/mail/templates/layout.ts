import {
  escapeHtml,
  sanitizeEmailColor,
  sanitizeEmailLogoUrl,
} from './helpers';
import { EmailBrand } from './types';

export function renderEmailLayout(options: {
  brand: EmailBrand;
  title: string;
  content: string;
  preheader?: string;
}): string {
  const brandName = escapeHtml(options.brand.name);
  const brandColor = sanitizeEmailColor(options.brand.primaryColor);
  const logoUrl = sanitizeEmailLogoUrl(options.brand.logoUrl);
  const brandHeader = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="${brandName}" style="display: block; max-width: 180px; max-height: 56px; margin: 0 auto;" />`
    : `<h1 style="color: ${brandColor}; margin: 0; font-size: 24px;">${brandName}</h1>`;
  const title = escapeHtml(options.title);
  const preheader = options.preheader
    ? `<div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">${escapeHtml(options.preheader)}</div>`
    : '';

  return `<!doctype html>
<html lang="zh-CN">
  <body style="margin: 0; padding: 0; background: #f3f4f6;">
    ${preheader}
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #111827;">
      <div style="text-align: center; margin-bottom: 24px;">
        ${brandHeader}
      </div>
      <div style="background: #ffffff; padding: 32px; border-radius: 10px;">
        <h2 style="margin: 0 0 20px; font-size: 20px;">${title}</h2>
        ${options.content}
      </div>
      <div style="text-align: center; margin-top: 24px; color: #6b7280; font-size: 12px;">
        <p style="margin: 0;">${escapeHtml(options.brand.footerText)}</p>
      </div>
    </div>
  </body>
</html>`;
}
