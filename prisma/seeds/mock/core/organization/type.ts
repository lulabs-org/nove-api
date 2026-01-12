import { Organization } from '@prisma/client';

export interface CreatedOrganization {
  organization: Organization;
}

export interface OrganizationConfig {
  name: string;
  code: string;
  description: string;
}
