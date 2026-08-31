import { UpdateDriveConfigDto } from './drive-config.dto';
import { defineIntegrationConfig } from '../utils';

export const driveConfig = defineIntegrationConfig(UpdateDriveConfigDto, {
  description: 'Organization Drive Configuration',
  defaults: {
    downloadUrlExpiresSeconds: 600,
    recycleRetentionDays: 30,
    imageMaxMiB: 20,
    documentMaxMiB: 100,
    audioMaxMiB: 2048,
    videoMaxMiB: 20480,
    aliyunSasRegionId: 'cn-beijing',
    scanTimeoutMs: 300000,
    scanPollIntervalMs: 3000,
    clamAvPort: 3310,
    clamAvTimeoutMs: 600000,
  },
});
