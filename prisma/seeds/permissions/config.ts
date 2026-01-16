import { Prisma } from '@prisma/client';
import type { PermissionConfig } from './type';

export const REAL_PERMISSION_CONFIGS: readonly PermissionConfig[] = [
  // ========== 用户管理 ==========
  {
    name: '查看用户',
    code: 'user:read',
    description: '查看用户信息',
    resource: 'user',
    action: 'read',
  },
  {
    name: '创建用户',
    code: 'user:create',
    description: '创建新用户',
    resource: 'user',
    action: 'create',
  },
  {
    name: '编辑用户',
    code: 'user:update',
    description: '编辑用户信息',
    resource: 'user',
    action: 'update',
  },
  {
    name: '删除用户',
    code: 'user:delete',
    description: '删除用户',
    resource: 'user',
    action: 'delete',
  },
  {
    name: '重置用户密码',
    code: 'user:reset-password',
    description: '重置用户密码',
    resource: 'user',
    action: 'reset-password',
  },

  // ========== 角色管理 ==========
  {
    name: '查看角色',
    code: 'role:read',
    description: '查看角色信息',
    resource: 'role',
    action: 'read',
  },
  {
    name: '创建角色',
    code: 'role:create',
    description: '创建新角色',
    resource: 'role',
    action: 'create',
  },
  {
    name: '编辑角色',
    code: 'role:update',
    description: '编辑角色信息',
    resource: 'role',
    action: 'update',
  },
  {
    name: '删除角色',
    code: 'role:delete',
    description: '删除角色',
    resource: 'role',
    action: 'delete',
  },
  {
    name: '分配角色权限',
    code: 'role:assign-permission',
    description: '为角色分配权限',
    resource: 'role',
    action: 'assign-permission',
  },

  // ========== 权限管理 ==========
  {
    name: '查看权限',
    code: 'permission:read',
    description: '查看权限信息',
    resource: 'permission',
    action: 'read',
  },
  {
    name: '创建权限',
    code: 'permission:create',
    description: '创建新权限',
    resource: 'permission',
    action: 'create',
  },
  {
    name: '编辑权限',
    code: 'permission:update',
    description: '编辑权限信息',
    resource: 'permission',
    action: 'update',
  },
  {
    name: '删除权限',
    code: 'permission:delete',
    description: '删除权限',
    resource: 'permission',
    action: 'delete',
  },

  // ========== 组织管理 ==========
  {
    name: '查看组织',
    code: 'organization:read',
    description: '查看组织信息',
    resource: 'organization',
    action: 'read',
  },
  {
    name: '创建组织',
    code: 'organization:create',
    description: '创建新组织',
    resource: 'organization',
    action: 'create',
  },
  {
    name: '编辑组织',
    code: 'organization:update',
    description: '编辑组织信息',
    resource: 'organization',
    action: 'update',
  },
  {
    name: '删除组织',
    code: 'organization:delete',
    description: '删除组织',
    resource: 'organization',
    action: 'delete',
  },

  // ========== 部门管理 ==========
  {
    name: '查看部门',
    code: 'department:read',
    description: '查看部门信息',
    resource: 'department',
    action: 'read',
  },
  {
    name: '创建部门',
    code: 'department:create',
    description: '创建新部门',
    resource: 'department',
    action: 'create',
  },
  {
    name: '编辑部门',
    code: 'department:update',
    description: '编辑部门信息',
    resource: 'department',
    action: 'update',
  },
  {
    name: '删除部门',
    code: 'department:delete',
    description: '删除部门',
    resource: 'department',
    action: 'delete',
  },

  // ========== 产品管理 ==========
  {
    name: '查看产品',
    code: 'product:read',
    description: '查看产品信息',
    resource: 'product',
    action: 'read',
  },
  {
    name: '创建产品',
    code: 'product:create',
    description: '创建新产品',
    resource: 'product',
    action: 'create',
  },
  {
    name: '编辑产品',
    code: 'product:update',
    description: '编辑产品信息',
    resource: 'product',
    action: 'update',
  },
  {
    name: '删除产品',
    code: 'product:delete',
    description: '删除产品',
    resource: 'product',
    action: 'delete',
  },
  {
    name: '产品上下架',
    code: 'product:toggle-status',
    description: '产品上下架操作',
    resource: 'product',
    action: 'toggle-status',
  },

  // ========== 订单管理 ==========
  {
    name: '查看订单',
    code: 'order:read',
    description: '查看订单信息',
    resource: 'order',
    action: 'read',
  },
  {
    name: '创建订单',
    code: 'order:create',
    description: '创建新订单',
    resource: 'order',
    action: 'create',
  },
  {
    name: '编辑订单',
    code: 'order:update',
    description: '编辑订单信息',
    resource: 'order',
    action: 'update',
  },
  {
    name: '删除订单',
    code: 'order:delete',
    description: '删除订单',
    resource: 'order',
    action: 'delete',
  },
  {
    name: '订单状态管理',
    code: 'order:status',
    description: '管理订单状态',
    resource: 'order',
    action: 'status',
  },

  // ========== 财务管理 ==========
  {
    name: '查看财务报表',
    code: 'finance:read',
    description: '查看财务报表',
    resource: 'finance',
    action: 'read',
  },
  {
    name: '导出财务数据',
    code: 'finance:export',
    description: '导出财务数据',
    resource: 'finance',
    action: 'export',
  },
  {
    name: '财务审核',
    code: 'finance:audit',
    description: '财务审核权限',
    resource: 'finance',
    action: 'audit',
  },

  // ========== 系统管理 ==========
  {
    name: '系统配置',
    code: 'system:config',
    description: '系统配置管理',
    resource: 'system',
    action: 'config',
  },
  {
    name: '系统监控',
    code: 'system:monitor',
    description: '系统监控',
    resource: 'system',
    action: 'monitor',
  },
  {
    name: '系统日志',
    code: 'system:log',
    description: '查看系统日志',
    resource: 'system',
    action: 'log',
  },

  // ========== 仪表板管理 ==========
  {
    name: '查看仪表板',
    code: 'dashboard:read',
    description: '查看仪表板',
    resource: 'dashboard',
    action: 'read',
  },
  {
    name: '管理仪表板',
    code: 'dashboard:manage',
    description: '管理仪表板配置',
    resource: 'dashboard',
    action: 'manage',
  },

  // ========== MCP Tool 使用权限 ==========
  {
    name: '使用问候工具',
    code: 'mcp-tool:greeting',
    description: '使用 MCP 问候工具',
    resource: 'mcp-tool',
    action: 'greeting',
  },
  {
    name: '使用会议统计工具',
    code: 'mcp-tool:meeting-stats',
    description: '使用 MCP 会议统计工具',
    resource: 'mcp-tool',
    action: 'meeting-stats',
  },
  {
    name: '使用会议详情工具',
    code: 'mcp-tool:meeting-details',
    description: '使用 MCP 会议详情工具',
    resource: 'mcp-tool',
    action: 'meeting-details',
  },
  {
    name: '使用用户信息工具',
    code: 'mcp-tool:user-info',
    description: '使用 MCP 用户信息工具',
    resource: 'mcp-tool',
    action: 'user-info',
  },
  {
    name: '使用当前用户信息工具',
    code: 'mcp-tool:current-user-info',
    description: '使用 MCP 当前用户信息工具',
    resource: 'mcp-tool',
    action: 'current-user-info',
  },
  {
    name: '使用用户ID搜索工具',
    code: 'mcp-tool:userid-search',
    description: '使用 MCP 用户ID搜索工具',
    resource: 'mcp-tool',
    action: 'userid-search',
  },
] as const satisfies readonly Prisma.PermissionCreateInput[];

export const PERMISSION_CONFIGS: readonly PermissionConfig[] = [
  // ========== 用户管理 ==========
  {
    name: '查看用户',
    code: 'user:read',
    description: '查看用户信息',
    resource: 'user',
    action: 'read',
  },
  {
    name: '创建用户',
    code: 'user:create',
    description: '创建新用户',
    resource: 'user',
    action: 'create',
  },
  {
    name: '编辑用户',
    code: 'user:update',
    description: '编辑用户信息',
    resource: 'user',
    action: 'update',
  },
  {
    name: '删除用户',
    code: 'user:delete',
    description: '删除用户',
    resource: 'user',
    action: 'delete',
  },
  {
    name: '重置用户密码',
    code: 'user:reset-password',
    description: '重置用户密码',
    resource: 'user',
    action: 'reset-password',
  },

  // ========== 角色管理 ==========
  {
    name: '查看角色',
    code: 'role:read',
    description: '查看角色信息',
    resource: 'role',
    action: 'read',
  },
  {
    name: '创建角色',
    code: 'role:create',
    description: '创建新角色',
    resource: 'role',
    action: 'create',
  },
  {
    name: '编辑角色',
    code: 'role:update',
    description: '编辑角色信息',
    resource: 'role',
    action: 'update',
  },
  {
    name: '删除角色',
    code: 'role:delete',
    description: '删除角色',
    resource: 'role',
    action: 'delete',
  },
  {
    name: '分配角色权限',
    code: 'role:assign-permission',
    description: '为角色分配权限',
    resource: 'role',
    action: 'assign-permission',
  },

  // ========== 权限管理 ==========
  {
    name: '查看权限',
    code: 'permission:read',
    description: '查看权限信息',
    resource: 'permission',
    action: 'read',
  },
  {
    name: '创建权限',
    code: 'permission:create',
    description: '创建新权限',
    resource: 'permission',
    action: 'create',
  },
  {
    name: '编辑权限',
    code: 'permission:update',
    description: '编辑权限信息',
    resource: 'permission',
    action: 'update',
  },
  {
    name: '删除权限',
    code: 'permission:delete',
    description: '删除权限',
    resource: 'permission',
    action: 'delete',
  },

  // ========== 组织管理 ==========
  {
    name: '查看组织',
    code: 'organization:read',
    description: '查看组织信息',
    resource: 'organization',
    action: 'read',
  },
  {
    name: '创建组织',
    code: 'organization:create',
    description: '创建新组织',
    resource: 'organization',
    action: 'create',
  },
  {
    name: '编辑组织',
    code: 'organization:update',
    description: '编辑组织信息',
    resource: 'organization',
    action: 'update',
  },
  {
    name: '删除组织',
    code: 'organization:delete',
    description: '删除组织',
    resource: 'organization',
    action: 'delete',
  },

  // ========== 部门管理 ==========
  {
    name: '查看部门',
    code: 'department:read',
    description: '查看部门信息',
    resource: 'department',
    action: 'read',
  },
  {
    name: '创建部门',
    code: 'department:create',
    description: '创建新部门',
    resource: 'department',
    action: 'create',
  },
  {
    name: '编辑部门',
    code: 'department:update',
    description: '编辑部门信息',
    resource: 'department',
    action: 'update',
  },
  {
    name: '删除部门',
    code: 'department:delete',
    description: '删除部门',
    resource: 'department',
    action: 'delete',
  },

  // ========== 产品管理 ==========
  {
    name: '查看产品',
    code: 'product:read',
    description: '查看产品信息',
    resource: 'product',
    action: 'read',
  },
  {
    name: '创建产品',
    code: 'product:create',
    description: '创建新产品',
    resource: 'product',
    action: 'create',
  },
  {
    name: '编辑产品',
    code: 'product:update',
    description: '编辑产品信息',
    resource: 'product',
    action: 'update',
  },
  {
    name: '删除产品',
    code: 'product:delete',
    description: '删除产品',
    resource: 'product',
    action: 'delete',
  },
  {
    name: '产品上下架',
    code: 'product:toggle-status',
    description: '产品上下架操作',
    resource: 'product',
    action: 'toggle-status',
  },

  // ========== 订单管理 ==========
  {
    name: '查看订单',
    code: 'order:read',
    description: '查看订单信息',
    resource: 'order',
    action: 'read',
  },
  {
    name: '创建订单',
    code: 'order:create',
    description: '创建新订单',
    resource: 'order',
    action: 'create',
  },
  {
    name: '编辑订单',
    code: 'order:update',
    description: '编辑订单信息',
    resource: 'order',
    action: 'update',
  },
  {
    name: '删除订单',
    code: 'order:delete',
    description: '删除订单',
    resource: 'order',
    action: 'delete',
  },
  {
    name: '订单状态管理',
    code: 'order:status',
    description: '管理订单状态',
    resource: 'order',
    action: 'status',
  },

  // ========== 财务管理 ==========
  {
    name: '查看财务报表',
    code: 'finance:read',
    description: '查看财务报表',
    resource: 'finance',
    action: 'read',
  },
  {
    name: '导出财务数据',
    code: 'finance:export',
    description: '导出财务数据',
    resource: 'finance',
    action: 'export',
  },
  {
    name: '财务审核',
    code: 'finance:audit',
    description: '财务审核权限',
    resource: 'finance',
    action: 'audit',
  },

  // ========== 系统管理 ==========
  {
    name: '系统配置',
    code: 'system:config',
    description: '系统配置管理',
    resource: 'system',
    action: 'config',
  },
  {
    name: '系统监控',
    code: 'system:monitor',
    description: '系统监控',
    resource: 'system',
    action: 'monitor',
  },
  {
    name: '系统日志',
    code: 'system:log',
    description: '查看系统日志',
    resource: 'system',
    action: 'log',
  },

  // ========== 仪表板管理 ==========
  {
    name: '查看仪表板',
    code: 'dashboard:read',
    description: '查看仪表板',
    resource: 'dashboard',
    action: 'read',
  },
  {
    name: '管理仪表板',
    code: 'dashboard:manage',
    description: '管理仪表板配置',
    resource: 'dashboard',
    action: 'manage',
  },

  // ========== MCP Tool 使用权限 ==========
  {
    name: '使用问候工具',
    code: 'mcp-tool:greeting',
    description: '使用 MCP 问候工具',
    resource: 'mcp-tool',
    action: 'greeting',
  },
  {
    name: '使用会议统计工具',
    code: 'mcp-tool:meeting-stats',
    description: '使用 MCP 会议统计工具',
    resource: 'mcp-tool',
    action: 'meeting-stats',
  },
  {
    name: '使用会议详情工具',
    code: 'mcp-tool:meeting-details',
    description: '使用 MCP 会议详情工具',
    resource: 'mcp-tool',
    action: 'meeting-details',
  },
  {
    name: '使用用户信息工具',
    code: 'mcp-tool:user-info',
    description: '使用 MCP 用户信息工具',
    resource: 'mcp-tool',
    action: 'user-info',
  },
  {
    name: '使用当前用户信息工具',
    code: 'mcp-tool:current-user-info',
    description: '使用 MCP 当前用户信息工具',
    resource: 'mcp-tool',
    action: 'current-user-info',
  },
  {
    name: '使用用户ID搜索工具',
    code: 'mcp-tool:userid-search',
    description: '使用 MCP 用户ID搜索工具',
    resource: 'mcp-tool',
    action: 'userid-search',
  },
] as const satisfies readonly Prisma.PermissionCreateInput[];
