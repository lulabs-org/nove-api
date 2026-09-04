import { UpdateLarkConfigDto } from '../dto/lark-config.dto';
import { defineSystemConfig, environment } from '../core';

export const larkConfig = defineSystemConfig(UpdateLarkConfigDto, {
  description: 'Organization Lark Configuration',
  fields: {
    appId: {
      required: true,
      environment: environment.string('LARK_APP_ID'),
    },
    appSecret: {
      required: true,
      secret: true,
      environment: environment.string('LARK_APP_SECRET'),
    },
    eventEncryptKey: {
      secret: true,
      environment: environment.string('LARK_EVENT_ENCRYPT_KEY'),
    },
    eventVerificationToken: {
      secret: true,
      environment: environment.string('LARK_EVENT_VERIFICATION_TOKEN'),
    },
  },
  restartRequiredOn: ['appId', 'appSecret'],
});
