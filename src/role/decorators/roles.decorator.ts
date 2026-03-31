/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-16 18:00:32
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-16 18:01:29
 * @FilePath: /nove_api/src/role/decorators/roles.decorator.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const ROLE_MODE_KEY = 'role_mode';

export enum RoleMode {
  ANY = 'any',
  ALL = 'all',
}

export const RequireRoles = (...roles: string[]) =>
  SetMetadata(ROLES_KEY, roles);

export const RequireAnyRole = (...roles: string[]) => {
  return (
    target: unknown,
    propertyKey?: string,
    descriptor?: PropertyDescriptor,
  ) => {
    SetMetadata(ROLES_KEY, roles)(target as object, propertyKey!, descriptor!);
    SetMetadata(ROLE_MODE_KEY, RoleMode.ANY)(
      target as object,
      propertyKey!,
      descriptor!,
    );
  };
};

export const RequireAllRoles = (...roles: string[]) => {
  return (
    target: unknown,
    propertyKey?: string,
    descriptor?: PropertyDescriptor,
  ) => {
    SetMetadata(ROLES_KEY, roles)(target as object, propertyKey!, descriptor!);
    SetMetadata(ROLE_MODE_KEY, RoleMode.ALL)(
      target as object,
      propertyKey!,
      descriptor!,
    );
  };
};
