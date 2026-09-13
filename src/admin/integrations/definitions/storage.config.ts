import { UpdateStorageConfigDto } from './storage-config.dto';
import { defineIntegrationConfig } from '../utils';

export * from './storage-config.dto';

export const storageConfig = defineIntegrationConfig(UpdateStorageConfigDto, {
  description: 'Object Storage Service Configuration',
  defaults: {
    provider: 'OSS',
    region: 'oss-cn-hangzhou',
    signedUrlExpiresSeconds: 600,
  },
  required: ['bucket', 'accessKeyId', 'accessKeySecret'],
  secrets: ['accessKeySecret'],
});
