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
} from '../dto';

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
}
