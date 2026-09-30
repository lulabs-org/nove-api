import { PermissionType, Prisma } from '@/generated/prisma/client';
import type { PermissionConfig } from './type';

const DRIVE_PERMISSION_CONFIGS: readonly PermissionConfig[] = [
  {
    name: '查看云盘',
    code: 'drive:read',
    description: '浏览和下载有权访问的云盘文件',
    resource: 'drive',
    action: 'read',
    type: PermissionType.API,
  },
  {
    name: '上传云盘文件',
    code: 'drive:upload',
    description: '创建文件夹和上传文件',
    resource: 'drive',
    action: 'upload',
    type: PermissionType.API,
  },
  {
    name: '编辑云盘文件',
    code: 'drive:update',
    description: '重命名和移动云盘文件',
    resource: 'drive',
    action: 'update',
    type: PermissionType.API,
  },
  {
    name: '删除云盘文件',
    code: 'drive:delete',
    description: '移入回收站和恢复文件',
    resource: 'drive',
    action: 'delete',
    type: PermissionType.API,
  },
  {
    name: '管理云盘授权',
    code: 'drive:manage-acl',
    description: '管理文件和文件夹授权',
    resource: 'drive',
    action: 'manage-acl',
    type: PermissionType.API,
  },
  {
    name: '云盘超级管理',
    code: 'drive:admin',
    description: '访问待归属空间和跨组织管理能力',
    resource: 'drive',
    action: 'admin',
    type: PermissionType.API,
  },
];

const SKILL_PERMISSION_CONFIGS: readonly PermissionConfig[] = [
  {
    name: '查看技能',
    code: 'skill:read',
    description: '查看和下载技能版本',
    resource: 'skill',
    action: 'read',
    type: PermissionType.API,
  },
  {
    name: '导入技能',
    code: 'skill:create',
    description: '上传首个技能 Zip',
    resource: 'skill',
    action: 'create',
    type: PermissionType.API,
  },
  {
    name: '维护技能',
    code: 'skill:update',
    description: '编辑技能、上传及切换版本',
    resource: 'skill',
    action: 'update',
    type: PermissionType.API,
  },
  {
    name: '删除技能',
    code: 'skill:delete',
    description: '删除技能或非当前版本',
    resource: 'skill',
    action: 'delete',
    type: PermissionType.API,
  },
];

const OAUTH_CLIENT_PERMISSION_CONFIGS: readonly PermissionConfig[] = [
  {
    name: '查看 OAuth 客户端',
    code: 'oauth-client:read',
    description: '查看 OAuth 客户端',
    resource: 'oauth-client',
    action: 'read',
    type: PermissionType.API,
  },
  {
    name: '创建 OAuth 客户端',
    code: 'oauth-client:create',
    description: '创建 OAuth 客户端',
    resource: 'oauth-client',
    action: 'create',
    type: PermissionType.API,
  },
  {
    name: '编辑 OAuth 客户端',
    code: 'oauth-client:update',
    description: '编辑 OAuth 客户端',
    resource: 'oauth-client',
    action: 'update',
    type: PermissionType.API,
  },
  {
    name: '禁用 OAuth 客户端',
    code: 'oauth-client:disable',
    description: '禁用或启用 OAuth 客户端',
    resource: 'oauth-client',
    action: 'disable',
    type: PermissionType.API,
  },
  {
    name: '轮换 OAuth 客户端密钥',
    code: 'oauth-client:rotate-secret',
    description: '轮换 OAuth 客户端密钥',
    resource: 'oauth-client',
    action: 'rotate-secret',
    type: PermissionType.API,
  },
];

// ========== 用户管理 ==========
const USER_PERMISSION_CONFIGS: readonly PermissionConfig[] = [
  {
    name: '查看用户',
    code: 'user:read',
    description: '查看用户信息',
    resource: 'user',
    action: 'read',
    type: PermissionType.API,
  },
  {
    name: '创建用户',
    code: 'user:create',
    description: '创建新用户',
    resource: 'user',
    action: 'create',
    type: PermissionType.API,
  },
  {
    name: '编辑用户',
    code: 'user:update',
    description: '编辑用户信息',
    resource: 'user',
    action: 'update',
    type: PermissionType.API,
  },
  {
    name: '删除用户',
    code: 'user:delete',
    description: '删除用户',
    resource: 'user',
    action: 'delete',
    type: PermissionType.API,
  },
  {
    name: '重置用户密码',
    code: 'user:reset-password',
    description: '重置用户密码',
    resource: 'user',
    action: 'reset-password',
    type: PermissionType.API,
  },
  {
    name: '查看身份凭证',
    code: 'identity-document:read',
    description: '查看用户身份凭证及脱敏证件号码',
    resource: 'identity-document',
    action: 'read',
    type: PermissionType.API,
  },
  {
    name: '维护身份凭证',
    code: 'identity-document:write',
    description: '登记、修改、提交和删除用户身份凭证',
    resource: 'identity-document',
    action: 'write',
    type: PermissionType.API,
  },
  {
    name: '审核身份凭证',
    code: 'identity-document:review',
    description: '审核通过或驳回待核验的身份凭证',
    resource: 'identity-document',
    action: 'review',
    type: PermissionType.API,
  },
];

// ========== 角色管理 ==========
const ROLE_PERMISSION_CONFIGS: readonly PermissionConfig[] = [
  {
    name: '查看角色',
    code: 'role:read',
    description: '查看角色信息',
    resource: 'role',
    action: 'read',
    type: PermissionType.API,
  },
  {
    name: '创建角色',
    code: 'role:create',
    description: '创建新角色',
    resource: 'role',
    action: 'create',
    type: PermissionType.API,
  },
  {
    name: '编辑角色',
    code: 'role:update',
    description: '编辑角色信息',
    resource: 'role',
    action: 'update',
    type: PermissionType.API,
  },
  {
    name: '删除角色',
    code: 'role:delete',
    description: '删除角色',
    resource: 'role',
    action: 'delete',
    type: PermissionType.API,
  },
  {
    name: '分配角色权限',
    code: 'role:assign-permission',
    description: '为角色分配权限',
    resource: 'role',
    action: 'assign-permission',
    type: PermissionType.API,
  },
];

// ========== 权限管理 ==========
const PERMISSION_PERMISSION_CONFIGS: readonly PermissionConfig[] = [
  {
    name: '查看权限',
    code: 'permission:read',
    description: '查看权限信息',
    resource: 'permission',
    action: 'read',
    type: PermissionType.API,
  },
  {
    name: '创建权限',
    code: 'permission:create',
    description: '创建新权限',
    resource: 'permission',
    action: 'create',
    type: PermissionType.API,
  },
  {
    name: '编辑权限',
    code: 'permission:update',
    description: '编辑权限信息',
    resource: 'permission',
    action: 'update',
    type: PermissionType.API,
  },
  {
    name: '删除权限',
    code: 'permission:delete',
    description: '删除权限',
    resource: 'permission',
    action: 'delete',
    type: PermissionType.API,
  },
];

// ========== 组织管理 ==========
const ORGANIZATION_PERMISSION_CONFIGS: readonly PermissionConfig[] = [
  {
    name: '查看组织',
    code: 'org:read',
    description: '查看组织信息',
    resource: 'org',
    action: 'read',
    type: PermissionType.API,
  },
  {
    name: '创建组织',
    code: 'org:create',
    description: '创建新组织',
    resource: 'org',
    action: 'create',
    type: PermissionType.API,
  },
  {
    name: '编辑组织',
    code: 'org:update',
    description: '编辑组织信息',
    resource: 'org',
    action: 'update',
    type: PermissionType.API,
  },
  {
    name: '删除组织',
    code: 'org:delete',
    description: '删除组织',
    resource: 'org',
    action: 'delete',
    type: PermissionType.API,
  },
];

// ========== 组织成员管理 ==========
const ORGANIZATION_MEMBER_PERMISSION_CONFIGS: readonly PermissionConfig[] = [
  {
    name: '查看组织成员',
    code: 'org-member:read',
    description: '查看组织成员信息',
    resource: 'org-member',
    action: 'read',
    type: PermissionType.API,
  },
  {
    name: '创建组织成员',
    code: 'org-member:create',
    description: '创建组织成员',
    resource: 'org-member',
    action: 'create',
    type: PermissionType.API,
  },
  {
    name: '编辑组织成员',
    code: 'org-member:update',
    description: '编辑组织成员信息',
    resource: 'org-member',
    action: 'update',
    type: PermissionType.API,
  },
  {
    name: '删除组织成员',
    code: 'org-member:delete',
    description: '删除组织成员',
    resource: 'org-member',
    action: 'delete',
    type: PermissionType.API,
  },
];

// ========== 数据权限管理 ==========
const DATA_PERMISSION_CONFIGS: readonly PermissionConfig[] = [
  {
    name: '查看数据权限规则',
    code: 'data-permission:read',
    description: '查看数据权限规则',
    resource: 'data-permission',
    action: 'read',
    type: PermissionType.API,
  },
  {
    name: '创建数据权限规则',
    code: 'data-permission:create',
    description: '创建数据权限规则',
    resource: 'data-permission',
    action: 'create',
    type: PermissionType.API,
  },
  {
    name: '编辑数据权限规则',
    code: 'data-permission:update',
    description: '编辑数据权限规则',
    resource: 'data-permission',
    action: 'update',
    type: PermissionType.API,
  },
  {
    name: '删除数据权限规则',
    code: 'data-permission:delete',
    description: '删除数据权限规则',
    resource: 'data-permission',
    action: 'delete',
    type: PermissionType.API,
  },
];

// ========== 部门管理 ==========
const DEPARTMENT_PERMISSION_CONFIGS: readonly PermissionConfig[] = [
  {
    name: '查看部门',
    code: 'dept:read',
    description: '查看部门信息',
    resource: 'dept',
    action: 'read',
    type: PermissionType.API,
  },
  {
    name: '创建部门',
    code: 'dept:create',
    description: '创建新部门',
    resource: 'dept',
    action: 'create',
    type: PermissionType.API,
  },
  {
    name: '编辑部门',
    code: 'dept:update',
    description: '编辑部门信息',
    resource: 'dept',
    action: 'update',
    type: PermissionType.API,
  },
  {
    name: '删除部门',
    code: 'dept:delete',
    description: '删除部门',
    resource: 'dept',
    action: 'delete',
    type: PermissionType.API,
  },
];

// ========== 产品管理 ==========
const PRODUCT_PERMISSION_CONFIGS: readonly PermissionConfig[] = [
  {
    name: '查看产品',
    code: 'product:read',
    description: '查看产品信息',
    resource: 'product',
    action: 'read',
    type: PermissionType.API,
  },
  {
    name: '创建产品',
    code: 'product:create',
    description: '创建新产品',
    resource: 'product',
    action: 'create',
    type: PermissionType.API,
  },
  {
    name: '编辑产品',
    code: 'product:update',
    description: '编辑产品信息',
    resource: 'product',
    action: 'update',
    type: PermissionType.API,
  },
  {
    name: '删除产品',
    code: 'product:delete',
    description: '删除产品',
    resource: 'product',
    action: 'delete',
    type: PermissionType.API,
  },
  {
    name: '产品上下架',
    code: 'product:toggle-status',
    description: '产品上下架操作',
    resource: 'product',
    action: 'toggle-status',
    type: PermissionType.API,
  },
];

// ========== 项目管理 ==========
const PROJECT_PERMISSION_CONFIGS: readonly PermissionConfig[] = [
  {
    name: '查看项目',
    code: 'project:read',
    description: '查看项目信息',
    resource: 'project',
    action: 'read',
    type: PermissionType.API,
  },
  {
    name: '创建项目',
    code: 'project:create',
    description: '创建新项目',
    resource: 'project',
    action: 'create',
    type: PermissionType.API,
  },
  {
    name: '编辑项目',
    code: 'project:update',
    description: '编辑项目信息',
    resource: 'project',
    action: 'update',
    type: PermissionType.API,
  },
  {
    name: '删除项目',
    code: 'project:delete',
    description: '软删除项目',
    resource: 'project',
    action: 'delete',
    type: PermissionType.API,
  },
  {
    name: '切换项目状态',
    code: 'project:toggle-status',
    description: '切换项目生命周期状态',
    resource: 'project',
    action: 'toggle-status',
    type: PermissionType.API,
  },
];

// ========== 渠道管理 ==========
const CHANNEL_PERMISSION_CONFIGS: readonly PermissionConfig[] = [
  {
    name: '查看渠道',
    code: 'channel:read',
    description: '查看渠道信息',
    resource: 'channel',
    action: 'read',
    type: PermissionType.API,
  },
  {
    name: '创建渠道',
    code: 'channel:create',
    description: '创建新渠道',
    resource: 'channel',
    action: 'create',
    type: PermissionType.API,
  },
  {
    name: '编辑渠道',
    code: 'channel:update',
    description: '编辑渠道信息和启用状态',
    resource: 'channel',
    action: 'update',
    type: PermissionType.API,
  },
  {
    name: '删除渠道',
    code: 'channel:delete',
    description: '删除未被订单引用的渠道',
    resource: 'channel',
    action: 'delete',
    type: PermissionType.API,
  },
];

// ========== 订单管理 ==========
const ORDER_PERMISSION_CONFIGS: readonly PermissionConfig[] = [
  {
    name: '查看订单',
    code: 'order:read',
    description: '查看订单信息',
    resource: 'order',
    action: 'read',
    type: PermissionType.API,
  },
  {
    name: '创建订单',
    code: 'order:create',
    description: '创建新订单',
    resource: 'order',
    action: 'create',
    type: PermissionType.API,
  },
  {
    name: '编辑订单',
    code: 'order:update',
    description: '编辑订单信息',
    resource: 'order',
    action: 'update',
    type: PermissionType.API,
  },
  {
    name: '删除订单',
    code: 'order:delete',
    description: '删除订单',
    resource: 'order',
    action: 'delete',
    type: PermissionType.API,
  },
  {
    name: '订单状态管理',
    code: 'order:status',
    description: '管理订单状态',
    resource: 'order',
    action: 'status',
    type: PermissionType.API,
  },
];

// ========== 订单售后管理 ==========
const ORDER_REFUND_PERMISSION_CONFIGS: readonly PermissionConfig[] = [
  {
    name: '查看订单售后',
    code: 'order-refund:read',
    description: '查看退款售后记录',
    resource: 'order-refund',
    action: 'read',
    type: PermissionType.API,
  },
  {
    name: '登记订单售后',
    code: 'order-refund:create',
    description: '登记退款售后记录',
    resource: 'order-refund',
    action: 'create',
    type: PermissionType.API,
  },
  {
    name: '编辑订单售后',
    code: 'order-refund:update',
    description: '编辑退款售后信息',
    resource: 'order-refund',
    action: 'update',
    type: PermissionType.API,
  },
  {
    name: '结算订单退款',
    code: 'order-refund:settle',
    description: '更新退款和财务结算状态',
    resource: 'order-refund',
    action: 'settle',
    type: PermissionType.API,
  },
  {
    name: '删除订单售后',
    code: 'order-refund:delete',
    description: '删除退款售后记录',
    resource: 'order-refund',
    action: 'delete',
    type: PermissionType.API,
  },
];

// ========== 财务管理 ==========
const FINANCE_PERMISSION_CONFIGS: readonly PermissionConfig[] = [
  {
    name: '查看财务报表',
    code: 'finance:read',
    description: '查看财务报表',
    resource: 'finance',
    action: 'read',
    type: PermissionType.API,
  },
  {
    name: '导出财务数据',
    code: 'finance:export',
    description: '导出财务数据',
    resource: 'finance',
    action: 'export',
    type: PermissionType.API,
  },
  {
    name: '财务审核',
    code: 'finance:audit',
    description: '财务审核权限',
    resource: 'finance',
    action: 'audit',
    type: PermissionType.API,
  },
];

// ========== 系统管理 ==========
const SYSTEM_PERMISSION_CONFIGS: readonly PermissionConfig[] = [
  {
    name: '系统配置',
    code: 'system:config',
    description: '系统配置管理',
    resource: 'system',
    action: 'config',
    type: PermissionType.API,
  },
  {
    name: '系统监控',
    code: 'system:monitor',
    description: '系统监控',
    resource: 'system',
    action: 'monitor',
    type: PermissionType.API,
  },
  {
    name: '系统日志',
    code: 'system:log',
    description: '查看系统日志',
    resource: 'system',
    action: 'log',
    type: PermissionType.API,
  },
];

// ========== 任务调度管理 ==========
const TASK_PERMISSION_CONFIGS: readonly PermissionConfig[] = [
  {
    name: '查看任务',
    code: 'task:read',
    description: '查看任务与队列状态',
    resource: 'task',
    action: 'read',
    type: PermissionType.API,
  },
  {
    name: '创建任务',
    code: 'task:create',
    description: '创建单次或周期任务',
    resource: 'task',
    action: 'create',
    type: PermissionType.API,
  },
  {
    name: '更新任务',
    code: 'task:update',
    description: '更新任务配置',
    resource: 'task',
    action: 'update',
    type: PermissionType.API,
  },
  {
    name: '删除任务',
    code: 'task:delete',
    description: '删除任务记录',
    resource: 'task',
    action: 'delete',
    type: PermissionType.API,
  },
  {
    name: '运行任务',
    code: 'task:run',
    description: '立即运行任务',
    resource: 'task',
    action: 'run',
    type: PermissionType.API,
  },
  {
    name: '暂停任务/队列',
    code: 'task:pause',
    description: '暂停任务或全局队列',
    resource: 'task',
    action: 'pause',
    type: PermissionType.API,
  },
  {
    name: '恢复任务/队列',
    code: 'task:resume',
    description: '恢复任务或全局队列',
    resource: 'task',
    action: 'resume',
    type: PermissionType.API,
  },
];

// ========== 仪表板管理 ==========
const DASHBOARD_PERMISSION_CONFIGS: readonly PermissionConfig[] = [
  {
    name: '查看仪表板',
    code: 'dashboard:read',
    description: '查看仪表板',
    resource: 'dashboard',
    action: 'read',
    type: PermissionType.API,
  },
  {
    name: '管理仪表板',
    code: 'dashboard:manage',
    description: '管理仪表板配置',
    resource: 'dashboard',
    action: 'manage',
    type: PermissionType.API,
  },
];

// ========== 分润管理 ==========
const PROFIT_SHARING_PERMISSION_CONFIGS: readonly PermissionConfig[] = [
  {
    name: '查看分润',
    code: 'profit-sharing:read',
    description: '查看分润规则和明细',
    resource: 'profit-sharing',
    action: 'read',
    type: PermissionType.API,
  },
  {
    name: '创建分润规则',
    code: 'profit-sharing:create',
    description: '创建分润规则',
    resource: 'profit-sharing',
    action: 'create',
    type: PermissionType.API,
  },
  {
    name: '更新分润规则',
    code: 'profit-sharing:update',
    description: '更新分润规则',
    resource: 'profit-sharing',
    action: 'update',
    type: PermissionType.API,
  },
  {
    name: '删除分润规则',
    code: 'profit-sharing:delete',
    description: '删除分润规则',
    resource: 'profit-sharing',
    action: 'delete',
    type: PermissionType.API,
  },
];

// ========== MCP Tool 使用权限 ==========
const MCP_TOOL_PERMISSION_CONFIGS: readonly PermissionConfig[] = [
  {
    name: '使用问候工具',
    code: 'mcp-tool:greeting',
    description: '使用 MCP 问候工具',
    resource: 'mcp-tool',
    action: 'greeting',
    type: PermissionType.API,
  },
  {
    name: '使用会议统计工具',
    code: 'mcp-tool:meeting-stats',
    description: '使用 MCP 会议统计工具',
    resource: 'mcp-tool',
    action: 'meeting-stats',
    type: PermissionType.API,
  },
  {
    name: '使用会议详情工具',
    code: 'mcp-tool:meeting-details',
    description: '使用 MCP 会议详情工具',
    resource: 'mcp-tool',
    action: 'meeting-details',
    type: PermissionType.API,
  },
  {
    name: '使用用户信息工具',
    code: 'mcp-tool:user-info',
    description: '使用 MCP 用户信息工具',
    resource: 'mcp-tool',
    action: 'user-info',
    type: PermissionType.API,
  },
  {
    name: '使用当前用户信息工具',
    code: 'mcp-tool:current-user-info',
    description: '使用 MCP 当前用户信息工具',
    resource: 'mcp-tool',
    action: 'current-user-info',
    type: PermissionType.API,
  },
  {
    name: '使用用户ID搜索工具',
    code: 'mcp-tool:userid-search',
    description: '使用 MCP 用户ID搜索工具',
    resource: 'mcp-tool',
    action: 'userid-search',
    type: PermissionType.API,
  },
];

// ========== API Key 管理 ==========
const API_KEY_PERMISSION_CONFIGS: readonly PermissionConfig[] = [
  {
    name: '查看 API Key',
    code: 'api-key:read',
    description: '查看 API Key 信息',
    resource: 'api-key',
    action: 'read',
    type: PermissionType.API,
  },
  {
    name: '创建 API Key',
    code: 'api-key:create',
    description: '创建新 API Key',
    resource: 'api-key',
    action: 'create',
    type: PermissionType.API,
  },
  {
    name: '编辑 API Key',
    code: 'api-key:update',
    description: '编辑 API Key 信息',
    resource: 'api-key',
    action: 'update',
    type: PermissionType.API,
  },
  {
    name: '删除 API Key',
    code: 'api-key:delete',
    description: '删除 API Key',
    resource: 'api-key',
    action: 'delete',
    type: PermissionType.API,
  },
  {
    name: '撤销 API Key',
    code: 'api-key:revoke',
    description: '撤销 API Key',
    resource: 'api-key',
    action: 'revoke',
    type: PermissionType.API,
  },
  {
    name: '轮换 API Key',
    code: 'api-key:rotate',
    description: '轮换 API Key',
    resource: 'api-key',
    action: 'rotate',
    type: PermissionType.API,
  },
];

// ========== 长期追踪报告管理 ==========
const TRACKING_REPORT_PERMISSION_CONFIGS: readonly PermissionConfig[] = [
  {
    name: '查看长期追踪报告',
    code: 'tracking-report:read',
    description: '查看长期追踪报告',
    resource: 'tracking-report',
    action: 'read',
    type: PermissionType.API,
  },
  {
    name: '创建长期追踪报告',
    code: 'tracking-report:create',
    description: '创建长期追踪报告',
    resource: 'tracking-report',
    action: 'create',
    type: PermissionType.API,
  },
  {
    name: '编辑长期追踪报告',
    code: 'tracking-report:update',
    description: '编辑长期追踪报告',
    resource: 'tracking-report',
    action: 'update',
    type: PermissionType.API,
  },
  {
    name: '删除长期追踪报告',
    code: 'tracking-report:delete',
    description: '删除长期追踪报告',
    resource: 'tracking-report',
    action: 'delete',
    type: PermissionType.API,
  },
];

// ========== 系统配置权限细化 ==========
const SYSTEM_CONFIG_PERMISSION_CONFIGS: readonly PermissionConfig[] = [
  {
    name: '查看系统配置',
    code: 'system:config:read',
    description: '查看系统配置信息',
    resource: 'system',
    action: 'config:read',
    type: PermissionType.API,
  },
  {
    name: '修改系统配置',
    code: 'system:config:write',
    description: '修改系统配置信息',
    resource: 'system',
    action: 'config:write',
    type: PermissionType.API,
  },
];

// ========== 会议管理 ==========
const MEETING_PERMISSION_CONFIGS: readonly PermissionConfig[] = [
  {
    name: '查看会议',
    code: 'meeting:read',
    description: '查看会议记录及相关信息',
    resource: 'meeting',
    action: 'read',
    type: PermissionType.API,
  },
  {
    name: '创建会议',
    code: 'meeting:create',
    description: '创建新会议记录',
    resource: 'meeting',
    action: 'create',
    type: PermissionType.API,
  },
  {
    name: '编辑会议',
    code: 'meeting:update',
    description: '编辑会议记录',
    resource: 'meeting',
    action: 'update',
    type: PermissionType.API,
  },
  {
    name: '删除会议',
    code: 'meeting:delete',
    description: '删除会议记录',
    resource: 'meeting',
    action: 'delete',
    type: PermissionType.API,
  },
  {
    name: '查看会议统计',
    code: 'meeting:stats_view',
    description: '查看会议统计数据',
    resource: 'meeting',
    action: 'stats_view',
    type: PermissionType.API,
  },
];

// ========== 妙记 (Minute) 管理 ==========
const MINUTE_PERMISSION_CONFIGS: readonly PermissionConfig[] = [
  {
    name: '查看妙记',
    code: 'minute:read',
    description: '查看妙记记录及相关信息（包括总结与转写）',
    resource: 'minute',
    action: 'read',
    type: PermissionType.API,
  },
  {
    name: '创建妙记',
    code: 'minute:create',
    description: '创建新妙记记录',
    resource: 'minute',
    action: 'create',
    type: PermissionType.API,
  },
  {
    name: '编辑妙记',
    code: 'minute:update',
    description: '编辑妙记记录（重新生成总结等）',
    resource: 'minute',
    action: 'update',
    type: PermissionType.API,
  },
  {
    name: '删除妙记',
    code: 'minute:delete',
    description: '删除妙记记录',
    resource: 'minute',
    action: 'delete',
    type: PermissionType.API,
  },
  {
    name: '查看妙记统计',
    code: 'minute:stats_view',
    description: '查看妙记统计数据',
    resource: 'minute',
    action: 'stats_view',
    type: PermissionType.API,
  },
];

// ========== 纪要总结管理 ==========
const MINUTE_SUMMARY_PERMISSION_CONFIGS: readonly PermissionConfig[] = [
  {
    name: '查看纪要总结',
    code: 'minute-summary:read',
    description: '查看纪要总结信息',
    resource: 'minute-summary',
    action: 'read',
    type: PermissionType.API,
  },
  {
    name: '创建纪要总结',
    code: 'minute-summary:create',
    description: '创建新纪要总结',
    resource: 'minute-summary',
    action: 'create',
    type: PermissionType.API,
  },
  {
    name: '编辑纪要总结',
    code: 'minute-summary:update',
    description: '编辑纪要总结信息',
    resource: 'minute-summary',
    action: 'update',
    type: PermissionType.API,
  },
  {
    name: '删除纪要总结',
    code: 'minute-summary:delete',
    description: '删除纪要总结',
    resource: 'minute-summary',
    action: 'delete',
    type: PermissionType.API,
  },
];

// ========== 发言人总结管理 ==========
const SPEAKER_SUMMARY_PERMISSION_CONFIGS: readonly PermissionConfig[] = [
  {
    name: '查看发言人总结',
    code: 'speaker-summary:read',
    description: '查看发言人总结信息',
    resource: 'speaker-summary',
    action: 'read',
    type: PermissionType.API,
  },
  {
    name: '创建发言人总结',
    code: 'speaker-summary:create',
    description: '创建新发言人总结',
    resource: 'speaker-summary',
    action: 'create',
    type: PermissionType.API,
  },
  {
    name: '编辑发言人总结',
    code: 'speaker-summary:update',
    description: '编辑发言人总结信息',
    resource: 'speaker-summary',
    action: 'update',
    type: PermissionType.API,
  },
  {
    name: '删除发言人总结',
    code: 'speaker-summary:delete',
    description: '删除发言人总结',
    resource: 'speaker-summary',
    action: 'delete',
    type: PermissionType.API,
  },
];

// ========== 平台用户管理 ==========
const PLATFORM_USER_PERMISSION_CONFIGS: readonly PermissionConfig[] = [
  {
    name: '查看平台用户',
    code: 'platform-user:read',
    description: '查看平台用户信息',
    resource: 'platform-user',
    action: 'read',
    type: PermissionType.API,
  },
  {
    name: '创建平台用户',
    code: 'platform-user:create',
    description: '创建新平台用户',
    resource: 'platform-user',
    action: 'create',
    type: PermissionType.API,
  },
  {
    name: '编辑平台用户',
    code: 'platform-user:update',
    description: '编辑平台用户信息',
    resource: 'platform-user',
    action: 'update',
    type: PermissionType.API,
  },
  {
    name: '删除平台用户',
    code: 'platform-user:delete',
    description: '删除平台用户',
    resource: 'platform-user',
    action: 'delete',
    type: PermissionType.API,
  },
];

export const REAL_PERMISSION_CONFIGS: readonly PermissionConfig[] = [
  ...USER_PERMISSION_CONFIGS,
  ...ROLE_PERMISSION_CONFIGS,
  ...PERMISSION_PERMISSION_CONFIGS,
  ...ORGANIZATION_PERMISSION_CONFIGS,
  ...ORGANIZATION_MEMBER_PERMISSION_CONFIGS,
  ...DATA_PERMISSION_CONFIGS,
  ...DEPARTMENT_PERMISSION_CONFIGS,
  ...PRODUCT_PERMISSION_CONFIGS,
  ...PROJECT_PERMISSION_CONFIGS,
  ...CHANNEL_PERMISSION_CONFIGS,
  ...ORDER_PERMISSION_CONFIGS,
  ...ORDER_REFUND_PERMISSION_CONFIGS,
  ...FINANCE_PERMISSION_CONFIGS,
  ...SYSTEM_PERMISSION_CONFIGS,
  ...TASK_PERMISSION_CONFIGS,
  ...DASHBOARD_PERMISSION_CONFIGS,
  ...PROFIT_SHARING_PERMISSION_CONFIGS,
  ...MCP_TOOL_PERMISSION_CONFIGS,
  ...API_KEY_PERMISSION_CONFIGS,
  ...TRACKING_REPORT_PERMISSION_CONFIGS,
  ...SYSTEM_CONFIG_PERMISSION_CONFIGS,
  ...MEETING_PERMISSION_CONFIGS,
  ...MINUTE_PERMISSION_CONFIGS,
  ...MINUTE_SUMMARY_PERMISSION_CONFIGS,
  ...SPEAKER_SUMMARY_PERMISSION_CONFIGS,
  ...PLATFORM_USER_PERMISSION_CONFIGS,
  ...DRIVE_PERMISSION_CONFIGS,
  ...SKILL_PERMISSION_CONFIGS,
  ...OAUTH_CLIENT_PERMISSION_CONFIGS,
] as const satisfies readonly Prisma.PermissionCreateInput[];

export const PERMISSION_CONFIGS: readonly PermissionConfig[] = REAL_PERMISSION_CONFIGS;
