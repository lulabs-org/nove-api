import { UpdateMailConfigDto } from '../dto/mail-config.dto';
import { defineSystemConfig, environment } from '../core';

export const mailConfig = defineSystemConfig(UpdateMailConfigDto, {
  description: 'Organization Mail Configuration',
  fields: {
    host: {
      required: true,
      default: 'smtp.gmail.com',
      environment: environment.string('SMTP_HOST'),
    },
    port: {
      required: true,
      default: 587,
      environment: environment.number('SMTP_PORT'),
    },
    secure: {
      default: false,
      environment: environment.boolean('SMTP_SECURE'),
    },
    user: {
      required: true,
      environment: environment.string('SMTP_USER'),
    },
    pass: {
      required: true,
      secret: true,
      environment: environment.string('SMTP_PASS'),
    },
    from: {
      required: true,
      environment: environment.string('SMTP_FROM'),
    },
    brandName: {
      default: 'Nove System',
      environment: environment.string('EMAIL_BRAND_NAME'),
    },
    brandLogoUrl: {
      environment: environment.string('EMAIL_BRAND_LOGO_URL'),
    },
    brandPrimaryColor: {
      default: '#2563eb',
      environment: environment.string('EMAIL_BRAND_PRIMARY_COLOR'),
    },
    brandFooterText: {
      default: '此邮件由 Nove System 自动发送，请勿回复。',
      environment: environment.string('EMAIL_BRAND_FOOTER_TEXT'),
    },
    brandPublicBaseUrl: {
      environment: environment.string('EMAIL_BRAND_PUBLIC_BASE_URL'),
    },
  },
});
