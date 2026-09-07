import { Injectable } from '@nestjs/common';
import { SingleOrgContextService } from '@/admin/system-config/services';

@Injectable()
export class MeetingOrganizationService {
  constructor(private readonly orgContext: SingleOrgContextService) {}

  resolveDefaultOrgId(): string {
    return this.orgContext.getOrgId();
  }
}
