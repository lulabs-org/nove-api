import { Permission, PermissionType } from '@/generated/prisma/client';

export interface PermissionConfig {
  name: string;
  code: string;
  description: string;
  resource: string;
  action: string;
  type: PermissionType;
}

export interface CreatedPermissions {
  permissions: Permission[];
}
