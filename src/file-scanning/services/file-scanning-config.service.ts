import { Injectable } from '@nestjs/common';
import { IntegrationsService } from '@/admin/integrations';
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

    const scanConfig = await this.integrations.getEffectiveConfig(
      orgId,
      'file-scanning',
    );
    if (scanConfig.source === 'database') {
      return scanConfig.value as FileScanningConfig;
    }

    // 病毒扫描配置历史上存放在 drive 模块下；拆分独立模块后保留读取以兼容存量数据
    const driveConfig = await this.integrations.getEffectiveConfig(
      orgId,
      'drive',
    );
    return (driveConfig?.value ?? {}) as FileScanningConfig;
  }
}
