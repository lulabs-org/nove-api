/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-09 02:46:29
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-09 03:17:42
 * @FilePath: /lulab_backend/src/common/decorators/permissions.decorator.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';
export const PERMISSION_MODE_KEY = 'permission_mode';

export enum PermissionMode {
  ANY = 'any',
  ALL = 'all',
}

export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

export const RequireAnyPermission = (...permissions: string[]) => {
  return (
    target: unknown,
    propertyKey?: string,
    descriptor?: PropertyDescriptor,
  ) => {
    SetMetadata(PERMISSIONS_KEY, permissions)(
      target as object,
      propertyKey!,
      descriptor!,
    );
    SetMetadata(PERMISSION_MODE_KEY, PermissionMode.ANY)(
      target as object,
      propertyKey!,
      descriptor!,
    );
  };
};

export const RequireAllPermissions = (...permissions: string[]) => {
  return (
    target: unknown,
    propertyKey?: string,
    descriptor?: PropertyDescriptor,
  ) => {
    SetMetadata(PERMISSIONS_KEY, permissions)(
      target as object,
      propertyKey!,
      descriptor!,
    );
    SetMetadata(PERMISSION_MODE_KEY, PermissionMode.ALL)(
      target as object,
      propertyKey!,
      descriptor!,
    );
  };
};
