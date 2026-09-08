import { UpdateLarkConfigDto } from '../dto/lark-config.dto';
import { defineSystemConfig } from '../core';

export const larkConfig = defineSystemConfig(UpdateLarkConfigDto, {
  description: 'Organization Lark Configuration',
  fields: {
    appId: {
      required: true,
    },
    appSecret: {
      required: true,
      secret: true,
    },
    eventEncryptKey: {
      secret: true,
    },
    eventVerificationToken: {
      secret: true,
    },
  },
  restartRequiredOn: ['appId', 'appSecret'],
});

