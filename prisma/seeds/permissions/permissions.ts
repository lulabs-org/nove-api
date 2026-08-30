/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-14 00:30:50
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-15 19:46:04
 * @FilePath: /nove_api/prisma/seeds/permissions/permissions.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { PrismaClient, Permission } from '@prisma/client';
import { NOVE_CLI_OAUTH_SCOPES } from '../oauth-scopes';
import { PERMISSION_CONFIGS, REAL_PERMISSION_CONFIGS } from './config';

const OAUTH_DELEGATABLE_PERMISSION_CODES = new Set<string>(
  NOVE_CLI_OAUTH_SCOPES,
);

const OAUTH_CLIENT_PERMISSION_CONFIGS = [
  {
    name: '查看 OAuth 客户端',
    code: 'oauth-client:read',
    description: '查看 OAuth 客户端',
    resource: 'oauth-client',
    action: 'read',
  },
  {
    name: '创建 OAuth 客户端',
    code: 'oauth-client:create',
    description: '创建 OAuth 客户端',
    resource: 'oauth-client',
    action: 'create',
  },
  {
    name: '编辑 OAuth 客户端',
    code: 'oauth-client:update',
    description: '编辑 OAuth 客户端',
    resource: 'oauth-client',
    action: 'update',
  },
  {
    name: '禁用 OAuth 客户端',
    code: 'oauth-client:disable',
    description: '禁用或启用 OAuth 客户端',
    resource: 'oauth-client',
    action: 'disable',
  },
  {
    name: '轮换 OAuth 客户端密钥',
    code: 'oauth-client:rotate-secret',
    description: '轮换 OAuth 客户端密钥',
    resource: 'oauth-client',
    action: 'rotate-secret',
  },
] as const;

export async function createPermissions(
  prisma: PrismaClient,
  useRealData = false,
): Promise<Permission[]> {
  const dataSource = useRealData ? '真实数据' : '模拟数据';
  console.log(`🔐 开始创建权限数据，使用${dataSource}...`);

  try {
    const permissionConfigs = [
      ...(useRealData ? REAL_PERMISSION_CONFIGS : PERMISSION_CONFIGS),
      ...OAUTH_CLIENT_PERMISSION_CONFIGS,
    ];
    const permissions: Permission[] = [];

    for (const permissionData of permissionConfigs) {
      const oauthDelegatable = OAUTH_DELEGATABLE_PERMISSION_CODES.has(
        permissionData.code,
      );
      const permission = await prisma.permission.upsert({
        where: { code: permissionData.code },
        update: { oauthDelegatable },
        create: { ...permissionData, oauthDelegatable },
      });
      permissions.push(permission);
      console.log(`✅ 创建权限: ${permission.name}`);
    }

    console.log(`🔑 权限数据创建完成，共 ${permissions.length} 个权限`);
    return permissions;
  } catch (error) {
    console.error('❌ 创建权限数据失败:', error);
    throw error;
  }
}
