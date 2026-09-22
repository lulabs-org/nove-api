/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-09-22 14:31:00
 * @Description: 认证上下文辅助函数：统一权限与身份判定
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { AuthContext } from '@/auth/types/auth-context.interface';

/**
 * 判断当前认证主体是否为平台超级管理员（拥有最高全局特权）。
 *
 * 满足以下任一条件即视为超级管理员：
 * 1. 拥有超级管理员角色 'SUPER_ADMIN'
 * 2. 拥有全局通配符权限 '*'
 *
 * @param auth 统一认证上下文
 */
export function isSuperAdmin(auth?: AuthContext | null): boolean {
  if (!auth) {
    return false;
  }

  const permissions = auth.permissions || [];
  const roles = auth.user?.roles || [];

  return permissions.includes('*') || roles.includes('SUPER_ADMIN');
}

/**
 * 判断当前认证主体是否具备超管或指定领域/全局的管理员特权。
 *
 * 满足以下任一条件即视为具备管理员特权：
 * 1. 拥有超级管理员角色 'SUPER_ADMIN'
 * 2. 拥有全局通配符权限 '*'
 * 3. 拥有全局管理员权限 'admin'
 * 4. 拥有指定领域/模块的管理员权限（例如 'order:admin'）
 *
 * 注：普通的机构/租户 'ADMIN' 角色不再自动具有无限制穿透特权，
 * 必须通过具体的权限点（如 'order:admin'）或数据权限规则（DataRules）进行精细化授权。
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

  if (roles.includes('SUPER_ADMIN')) {
    return true;
  }

  if (
    permissions.includes('*') ||
    permissions.includes('admin') ||
    (domainAdminPermission && permissions.includes(domainAdminPermission))
  ) {
    return true;
  }

  return false;
}
