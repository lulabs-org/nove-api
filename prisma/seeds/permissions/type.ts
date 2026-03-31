import { Permission } from '@prisma/client';

export interface PermissionConfig {
  name: string;
  code: string;
  description: string;
  resource: string;
  action: string;
}

export interface CreatedPermissions {
  permissions: Permission[];
}
