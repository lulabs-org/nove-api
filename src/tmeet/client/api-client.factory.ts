import { Injectable } from '@nestjs/common';
import { SystemConfigService } from '@/admin/system-config/services';
import { TMeetApiService } from './api.service';

@Injectable()
export class TMeetApiClientFactory {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  async forOrg(orgId: string): Promise<TMeetApiService> {
    if (!orgId?.trim()) throw new Error('Organization is required');
    const { value } = await this.systemConfigService.getEffectiveConfig(
      orgId,
      'tencent-meeting',
    );
    return new TMeetApiService({
      secretId: String(value.secretId ?? ''),
      secretKey: String(value.secretKey ?? ''),
      appId: String(value.appId ?? ''),
      sdkId: String(value.sdkId ?? ''),
      userId: String(value.userId ?? ''),
    });
  }
}
