import { UpdateDriveConfigDto } from '../dto/drive-config.dto';
import { defineSystemConfig, environment } from '../core';

export const driveConfig = defineSystemConfig(UpdateDriveConfigDto, {
  description: 'Drive and meeting storage configuration',
  fields: {
    defaultOrgId: {
      required: true,
    },
    downloadUrlExpiresSeconds: {
      default: 600,
    },
    recycleRetentionDays: {
      default: 30,
    },
    allowedExtensions: {},
    imageMaxMiB: {
      default: 20,
    },
    documentMaxMiB: {
      default: 100,
    },
    audioMaxMiB: {
      default: 2048,
    },
    videoMaxMiB: {
      default: 20480,
    },
    malwareScanProvider: {
      environment: environment.string('DRIVE_MALWARE_SCAN_PROVIDER'),
    },
    aliyunSasRegionId: {
      default: 'cn-beijing',
    },
    scanTimeoutMs: {
      default: 300000,
    },
    scanPollIntervalMs: {
      default: 3000,
    },
    clamAvHost: {
      environment: environment.string('CLAMAV_HOST'),
    },
    clamAvPort: {
      default: 3310,
      environment: environment.number('CLAMAV_PORT'),
    },
    clamAvTimeoutMs: {
      default: 600000,
      environment: environment.number('CLAMAV_TIMEOUT_MS'),
    },
  },
});
