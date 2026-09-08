import { UpdateMailConfigDto } from '../dto/mail-config.dto';
import { defineSystemConfig } from '../core';

export const mailConfig = defineSystemConfig(UpdateMailConfigDto, {
  description: 'Organization Mail Configuration',
  fields: {
    host: {
      required: true,
      default: 'smtp.gmail.com',
    },
    port: {
      required: true,
      default: 587,
    },
    secure: {
      default: false,
    },
    user: {
      required: true,
    },
    pass: {
      required: true,
      secret: true,
    },
    from: {
      required: true,
    },
    brandName: {
      default: 'Nove System',
    },
    brandLogoUrl: {},
    brandPrimaryColor: {
      default: '#2563eb',
    },
    brandFooterText: {
      default: '此邮件由 Nove System 自动发送，请勿回复。',
    },
    brandPublicBaseUrl: {},
  },
});

