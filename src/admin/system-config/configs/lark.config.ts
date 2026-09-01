import { UpdateLarkConfigDto } from '../dto/lark-config.dto';
import { defineSystemConfig, environment } from './system-config.definition';

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
      environment: environment.string('LARK_APP_SECRET', { trim: false }),
    },
    eventEncryptKey: {
      secret: true,
      environment: environment.string('LARK_EVENT_ENCRYPT_KEY', {
        trim: false,
      }),
    },
    eventVerificationToken: {
      secret: true,
      environment: environment.string('LARK_EVENT_VERIFICATION_TOKEN', {
        trim: false,
      }),
    },
    bitableAppToken: {
      required: true,
      secret: true,
      environment: environment.string('LARK_BITABLE_APP_TOKEN', {
        trim: false,
      }),
    },
    meetingTableId: {
      required: true,
      environment: environment.string('LARK_TABLE_MEETING_RECORD'),
    },
    meetingUserTableId: {
      required: true,
      environment: environment.string('LARK_TABLE_MEETING_USER'),
    },
    recordingFileTableId: {
      required: true,
      environment: environment.string('LARK_TABLE_MEETING_RECORDING'),
    },
    personalSummaryTableId: {
      required: true,
      environment: environment.string('LARK_TABLE_PERSONAL_MEETING_SUMMARY'),
    },
  },
});
