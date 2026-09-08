import { UpdateTencentMeetingConfigDto } from '../dto/tencent-meeting-config.dto';
import { defineSystemConfig } from '../core';

export const tencentMeetingConfig = defineSystemConfig(
  UpdateTencentMeetingConfigDto,
  {
    description: 'Organization Tencent Meeting Configuration',
    fields: {
      appId: {
        required: true,
      },
      sdkId: {
        required: true,
      },
      secretId: {
        required: true,
        secret: true,
      },
      secretKey: {
        required: true,
        secret: true,
      },
      userId: {
        required: true,
      },
      webhookToken: {
        secret: true,
      },
      encodingAesKey: {
        secret: true,
      },
    },
  },
);

