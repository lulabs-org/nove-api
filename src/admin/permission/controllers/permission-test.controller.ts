// import { Controller, Get, Post, Put, Delete, UseGuards } from '@nestjs/common';
// import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
// import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
// import { User, CurrentUser } from '@/auth/decorators/user.decorator';
// import { PermissionGuard } from '@/common/guards';
// import { RequirePermissions, RequireAnyPermission, RequireAllPermissions } from '@/common/decorators';

// @ApiTags('Permission Test')
// @Controller('permission-test')
// @UseGuards(JwtAuthGuard, PermissionGuard)
// @ApiBearerAuth()
// export class PermissionTestController {
//   @Get('users')
//   @RequirePermissions('user:read')
//   @ApiOperation({ summary: '查看用户列表 - 需要 user:read 权限' })
//   @ApiResponse({ status: 200, description: '成功' })
//   @ApiResponse({ status: 403, description: '权限不足' })
//   getUsers(@User() user: CurrentUser) {
//     return {
//       message: '查看用户列表成功',
//       user: user.id,
//       data: [],
//     };
//   }

//   @Post('users')
//   @RequirePermissions('user:create')
//   @ApiOperation({ summary: '创建用户 - 需要 user:create 权限' })
//   @ApiResponse({ status: 201, description: '创建成功' })
//   @ApiResponse({ status: 403, description: '权限不足' })
//   createUser(@User() user: CurrentUser) {
//     return {
//       message: '创建用户成功',
//       user: user.id,
//     };
//   }

//   @Put('users/:id')
//   @RequirePermissions('user:update')
//   @ApiOperation({ summary: '更新用户 - 需要 user:update 权限' })
//   @ApiResponse({ status: 200, description: '更新成功' })
//   @ApiResponse({ status: 403, description: '权限不足' })
//   updateUser(@User() user: CurrentUser) {
//     return {
//       message: '更新用户成功',
//       user: user.id,
//     };
//   }

//   @Delete('users/:id')
//   @RequirePermissions('user:delete')
//   @ApiOperation({ summary: '删除用户 - 需要 user:delete 权限' })
//   @ApiResponse({ status: 200, description: '删除成功' })
//   @ApiResponse({ status: 403, description: '权限不足' })
//   deleteUser(@User() user: CurrentUser) {
//     return {
//       message: '删除用户成功',
//       user: user.id,
//     };
//   }

//   @Get('admin-dashboard')
//   @RequireAllPermissions('dashboard:read', 'system:monitor')
//   @ApiOperation({ summary: '管理员仪表板 - 需要同时拥有 dashboard:read 和 system:monitor 权限' })
//   @ApiResponse({ status: 200, description: '成功' })
//   @ApiResponse({ status: 403, description: '权限不足' })
//   getAdminDashboard(@User() user: CurrentUser) {
//     return {
//       message: '访问管理员仪表板成功',
//       user: user.id,
//       data: {
//         totalUsers: 100,
//         activeUsers: 80,
//         totalOrders: 500,
//       },
//     };
//   }

//   @Get('reports')
//   @RequireAnyPermission('finance:export', 'system:log')
//   @ApiOperation({ summary: '查看报告 - 需要拥有 finance:export 或 system:log 任一权限' })
//   @ApiResponse({ status: 200, description: '成功' })
//   @ApiResponse({ status: 403, description: '权限不足' })
//   getReports(@User() user: CurrentUser) {
//     return {
//       message: '查看报告成功',
//       user: user.id,
//       data: [],
//     };
//   }

//   @Get('system-config')
//   @RequirePermissions('system:config')
//   @ApiOperation({ summary: '系统配置 - 需要 system:config 权限' })
//   @ApiResponse({ status: 200, description: '成功' })
//   @ApiResponse({ status: 403, description: '权限不足' })
//   getSystemConfig(@User() user: CurrentUser) {
//     return {
//       message: '获取系统配置成功',
//       user: user.id,
//       config: {
//         maintenance: false,
//         debug: false,
//       },
//     };
//   }
// }
