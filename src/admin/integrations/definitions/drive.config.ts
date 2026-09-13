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
  },
});
