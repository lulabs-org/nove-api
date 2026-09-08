import { Injectable } from '@nestjs/common';
import { IntegrationsService } from '@/admin/integrations';
import { TMeetApiService } from './api.service';

@Injectable()
export class TMeetApiClientFactory {
  constructor(private readonly integrationsService: IntegrationsService) {}

  async forOrg(orgId: string): Promise<TMeetApiService> {
    if (!orgId?.trim()) throw new Error('Organization is required');
    const { value } = await this.integrationsService.getEffectiveConfig(
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
