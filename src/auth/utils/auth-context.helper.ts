/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-09-22 14:31:00
 * @Description: 认证上下文辅助函数：统一权限与身份判定
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { AuthContext } from '@/auth/types/auth-context.interface';

/**
 * 判断当前认证主体是否具备超管或管理员特权。
 *
 * 满足以下任一条件即视为具备管理员特权：
 * 1. 拥有全局通配符权限 '*'
 * 2. 拥有全局管理员权限 'admin'
 * 3. 拥有指定领域/模块的管理员权限（例如 'order:admin'）
 * 4. 角色包含 'SUPER_ADMIN' 或 'ADMIN'
 *
 * @param auth 统一认证上下文
 * @param domainAdminPermission 可选的特定领域管理员权限，如 'order:admin'
 */
export function isSuperOrAdmin(
  auth?: AuthContext | null,
  domainAdminPermission?: string,
): boolean {
  if (!auth) {
    return false;
  }

  const permissions = auth.permissions || [];
  const roles = auth.user?.roles || [];

  if (
    permissions.includes('*') ||
    permissions.includes('admin') ||
    (domainAdminPermission && permissions.includes(domainAdminPermission))
  ) {
    return true;
  }

  if (roles.includes('SUPER_ADMIN') || roles.includes('ADMIN')) {
    return true;
  }

  return false;
}
