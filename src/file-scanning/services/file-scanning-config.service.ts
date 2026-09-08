import { Injectable } from '@nestjs/common';
import { IntegrationsService } from '@/admin/integrations';
import { isIntegrationModule } from '@/admin/integrations/definitions';
import { SingleOrgContextService } from '@/admin/org';
import { FileScanningConfig } from '../types';

@Injectable()
export class FileScanningConfigService {
  constructor(
    private readonly integrations: IntegrationsService,
    private readonly orgContext: SingleOrgContextService,
  ) {}

  async getConfig(): Promise<FileScanningConfig> {
    const orgId = this.orgContext.getOrgId();

    if (isIntegrationModule('file-scanning')) {
      const scanConfig = await this.integrations.getEffectiveConfig(
        orgId,
        'file-scanning',
      );
      if (scanConfig?.value && Object.keys(scanConfig.value).length > 0) {
        return scanConfig.value as FileScanningConfig;
      }
    }

    const driveConfig = await this.integrations.getEffectiveConfig(
      orgId,
      'drive',
    );
    return (driveConfig?.value ?? {}) as FileScanningConfig;
  }
}
