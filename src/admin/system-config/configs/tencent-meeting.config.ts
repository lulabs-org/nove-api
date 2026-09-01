import { UpdateTencentMeetingConfigDto } from '../dto/tencent-meeting-config.dto';
import { defineSystemConfig, environment } from './system-config.definition';

export const tencentMeetingConfig = defineSystemConfig(
  UpdateTencentMeetingConfigDto,
  {
    description: 'Organization Tencent Meeting Configuration',
    fields: {
      appId: {
        required: true,
        environment: environment.string('TENCENT_MEETING_APP_ID'),
      },
      sdkId: {
        required: true,
        environment: environment.string('TENCENT_MEETING_SDK_ID'),
      },
      secretId: {
        required: true,
        secret: true,
        environment: environment.string('TENCENT_MEETING_SECRET_ID', {
          trim: false,
        }),
      },
      secretKey: {
        required: true,
        secret: true,
        environment: environment.string('TENCENT_MEETING_SECRET_KEY', {
          trim: false,
        }),
      },
      userId: {
        required: true,
        environment: environment.string('USER_ID'),
      },
      webhookToken: {
        secret: true,
        environment: environment.string('TENCENT_MEETING_TOKEN', {
          trim: false,
        }),
      },
      encodingAesKey: {
        secret: true,
        environment: environment.string('TENCENT_MEETING_ENCODING_AES_KEY', {
          trim: false,
        }),
      },
    },
  },
);
