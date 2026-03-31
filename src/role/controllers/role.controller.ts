import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RoleService } from '../services/role.service';
import {
  CreateRoleDto,
  UpdateRoleDto,
  QueryRoleDto,
  RoleDto,
  RoleListResponse,
  SetRolePermissionsDto,
  CreateRoleBindingDto,
  RoleBindingDto,
} from '../dto';
import { PermissionDto } from '@/permission/dto';

@ApiTags('Admin - Roles')
@Controller('admin/roles')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @ApiOperation({
    summary: '创建角色',
    description: '创建新的角色',
  })
  @ApiResponse({
    status: 201,
    description: '角色创建成功',
    type: RoleDto,
  })
  @ApiResponse({
    status: 400,
    description: '请求参数无效',
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  async create(@Body() dto: CreateRoleDto): Promise<RoleDto> {
    return this.roleService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: '列出角色',
    description: '获取角色列表（支持分页和筛选）',
  })
  @ApiResponse({
    status: 200,
    description: '角色列表',
    type: RoleListResponse,
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  async findAll(@Query() query: QueryRoleDto): Promise<RoleListResponse> {
    return this.roleService.findAll(query);
  }

  @Get('code/:code')
  @ApiOperation({
    summary: '根据编码获取角色',
    description: '根据角色编码获取角色详情',
  })
  @ApiParam({
    name: 'code',
    description: '角色编码',
    example: 'admin',
  })
  @ApiResponse({
    status: 200,
    description: '角色详情',
    type: RoleDto,
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  @ApiResponse({
    status: 404,
    description: '角色不存在',
  })
  async findByCode(@Param('code') code: string): Promise<RoleDto> {
    return this.roleService.findByCode(code);
  }

  @Get(':id')
  @ApiOperation({
    summary: '获取角色详情',
    description: '根据 ID 获取角色详情',
  })
  @ApiParam({
    name: 'id',
    description: '角色 ID',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 200,
    description: '角色详情',
    type: RoleDto,
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  @ApiResponse({
    status: 404,
    description: '角色不存在',
  })
  async findById(@Param('id') id: string): Promise<RoleDto> {
    return this.roleService.findById(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: '更新角色',
    description: '更新角色信息',
  })
  @ApiParam({
    name: 'id',
    description: '角色 ID',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 200,
    description: '角色更新成功',
    type: RoleDto,
  })
  @ApiResponse({
    status: 400,
    description: '请求参数无效',
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  @ApiResponse({
    status: 404,
    description: '角色不存在',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<RoleDto> {
    return this.roleService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '删除角色',
    description: '删除角色（软删除）',
  })
  @ApiParam({
    name: 'id',
    description: '角色 ID',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 204,
    description: '角色删除成功',
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  @ApiResponse({
    status: 404,
    description: '角色不存在',
  })
  async delete(@Param('id') id: string): Promise<void> {
    return this.roleService.delete(id);
  }

  @Put('orgs/:orgId/roles/:roleId/permissions')
  @ApiOperation({
    summary: '配置角色权限',
    description: '为角色配置权限列表',
  })
  @ApiParam({
    name: 'orgId',
    description: '组织 ID',
    example: 'clx1234567890abcdef',
  })
  @ApiParam({
    name: 'roleId',
    description: '角色 ID',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 200,
    description: '权限配置成功',
    type: [PermissionDto],
  })
  @ApiResponse({
    status: 400,
    description: '请求参数无效',
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  @ApiResponse({
    status: 404,
    description: '角色不存在',
  })
  async setRolePermissions(
    @Param('roleId') roleId: string,
    @Body() dto: SetRolePermissionsDto,
  ): Promise<PermissionDto[]> {
    return this.roleService.setRolePermissions(roleId, dto);
  }

  @Post('orgs/:orgId/role-bindings')
  @ApiOperation({
    summary: '绑定角色给成员',
    description: '为成员绑定角色（组织级或部门级）',
  })
  @ApiParam({
    name: 'orgId',
    description: '组织 ID',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 201,
    description: '角色绑定成功',
    type: RoleBindingDto,
  })
  @ApiResponse({
    status: 400,
    description: '请求参数无效',
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  @ApiResponse({
    status: 404,
    description: '角色或成员不存在',
  })
  async createRoleBinding(
    @Param('orgId') orgId: string,
    @Body() dto: CreateRoleBindingDto,
  ): Promise<RoleBindingDto> {
    return this.roleService.createRoleBinding(orgId, dto);
  }

  @Delete('orgs/:orgId/role-bindings/:bindingId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '解绑角色',
    description: '解除成员的角色绑定',
  })
  @ApiParam({
    name: 'orgId',
    description: '组织 ID',
    example: 'clx1234567890abcdef',
  })
  @ApiParam({
    name: 'bindingId',
    description: '绑定 ID',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 204,
    description: '角色解绑成功',
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  @ApiResponse({
    status: 404,
    description: '角色绑定不存在',
  })
  async deleteRoleBinding(
    @Param('bindingId') bindingId: string,
  ): Promise<void> {
    return this.roleService.deleteRoleBinding(bindingId);
  }
}
