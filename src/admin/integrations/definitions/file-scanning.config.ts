import { UpdateFileScanningConfigDto } from './file-scanning-config.dto';
import { defineIntegrationConfig } from '../utils';

export const fileScanningConfig = defineIntegrationConfig(
  UpdateFileScanningConfigDto,
  {
    description: 'File Scanning Service Configuration',
    defaults: {
      aliyunSasRegionId: 'cn-beijing',
      scanTimeoutMs: 300000,
      scanPollIntervalMs: 3000,
      clamAvPort: 3310,
      clamAvTimeoutMs: 600000,
    },
  },
);
