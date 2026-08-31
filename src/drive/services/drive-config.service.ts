import { Injectable } from '@nestjs/common';
import { IntegrationsService } from '@/admin/integrations';
import { SingleOrgContextService } from '@/admin/org';

@Injectable()
export class DriveConfigService {
  constructor(
    private readonly integrations: IntegrationsService,
    private readonly orgContext: SingleOrgContextService,
  ) {}

  async getConfig(module: 'drive') {
    const config = await this.integrations.getEffectiveConfig(
      this.orgContext.getOrgId(),
      module,
    );
    return config.value;
  }
}
