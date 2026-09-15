import { Injectable, Logger } from '@nestjs/common';
import { IntegrationsRepository } from '@/admin/integrations/repositories';
import { aliyunSmsConfig } from '@/admin/integrations/definitions';
import { decodeConfig, isConfigured } from '@/admin/integrations/utils';

export const ALIYUN_SMS_CONFIG_KEY = 'ALIYUN_SMS_CONFIG';

export interface AliyunSmsConfigValue {
  accessKeyId: string;
  accessKeySecret: string;
  signName: string;
  verificationTemplateCode: string;
  securityChangeTemplateCode: string;
}

@Injectable()
export class AliyunSmsConfigService {
  private readonly logger = new Logger(AliyunSmsConfigService.name);

  constructor(private readonly repository: IntegrationsRepository) { }

  async getRequiredConfig(): Promise<AliyunSmsConfigValue> {
    const stored = await this.repository.findFirstByKey(ALIYUN_SMS_CONFIG_KEY);
    if (!stored) throw new Error('SMS_NOT_CONFIGURED');

    try {
      const value = decodeConfig(
        aliyunSmsConfig,
        stored.value as Record<string, string>,
      );
      if (!isConfigured(aliyunSmsConfig, value)) {
        throw new Error('SMS_CONFIG_INCOMPLETE');
      }
      return value as unknown as AliyunSmsConfigValue;
    } catch {
      this.logger.error(
        'Failed to decrypt Aliyun SMS integration configuration',
      );
      throw new Error('SMS_NOT_CONFIGURED');
    }
  }
}
