export const OAUTH_SCOPES: Record<string, string> = {
  // 会议管理
  'meeting:read': '查看会议详情及列表',
  'meeting:create': '创建会议',
  'meeting:update': '更新会议信息',
  'meeting:delete': '删除会议',
  'meeting:stats_view': '查看会议统计数据',

  // 纪要与发言总结
  'minute:read': '查看会议纪要',
  'minute:delete': '删除会议纪要',
  'speaker-summary:read': '查看发言人总结',
  'speaker-summary:create': '创建发言人总结',
  'speaker-summary:update': '更新发言人总结',
  'speaker-summary:delete': '删除发言人总结',
  'tracking-report:read': '查看追踪报告',
  'tracking-report:create': '创建追踪报告',
  'tracking-report:update': '更新追踪报告',
  'tracking-report:delete': '删除追踪报告',

  // 用户管理
  'user:read': '查看用户信息',
  'user:create': '创建用户',
  'user:update': '更新用户信息',
  'user:delete': '删除用户',

  // 产品管理
  'product:read': '查看产品列表及详情',
  'product:create': '创建产品',
  'product:update': '更新产品信息',
  'product:toggle-status': '切换产品上架状态',
  'product:delete': '删除产品',

  // 项目管理
  'project:read': '查看项目列表及详情',
  'project:create': '创建项目',
  'project:update': '更新项目信息',
  'project:toggle-status': '切换项目状态',
  'project:delete': '删除项目',

  // 订单管理
  'order:read': '查看订单列表及详情',
  'order:create': '创建订单',
  'order:update': '更新订单信息',
  'order:status': '更新订单状态',
  'order:delete': '删除订单',

  // 云盘管理
  'drive:read': '浏览和下载云盘文件',
  'drive:upload': '创建文件夹和上传云盘文件',
  'drive:update': '重命名和移动云盘文件',
  'drive:delete': '移入回收站和恢复文件',
  'drive:manage-acl': '管理文件和文件夹授权',
};
