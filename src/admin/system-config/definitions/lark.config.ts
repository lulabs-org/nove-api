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
    bitableAppToken: {
      required: true,
      secret: true,
      environment: environment.string('LARK_BITABLE_APP_TOKEN'),
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
  restartRequiredOn: ['appId', 'appSecret'],
});
