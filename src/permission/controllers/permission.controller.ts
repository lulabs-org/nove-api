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
import { PermissionService } from '../services/permission.service';
import {
  CreatePermissionDto,
  UpdatePermissionDto,
  QueryPermissionDto,
  PermissionTreeDto,
  PermissionListResponse,
} from '../dto';

@ApiTags('Admin - Permissions')
@Controller('admin/permissions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Post()
  @ApiOperation({
    summary: '创建权限',
    description: '创建新的权限',
  })
  @ApiResponse({
    status: 201,
    description: '权限创建成功',
    type: PermissionTreeDto,
  })
  @ApiResponse({
    status: 400,
    description: '请求参数无效',
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  async create(@Body() dto: CreatePermissionDto): Promise<PermissionTreeDto> {
    return this.permissionService.createPermission(dto);
  }

  @Get()
  @ApiOperation({
    summary: '列出权限',
    description: '获取权限列表（支持分页和筛选）',
  })
  @ApiResponse({
    status: 200,
    description: '权限列表',
    type: PermissionListResponse,
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  async findAll(
    @Query() query: QueryPermissionDto,
  ): Promise<PermissionListResponse> {
    return this.permissionService.findAll(query);
  }

  @Get('tree')
  @ApiOperation({
    summary: '获取权限树',
    description: '获取权限树形结构',
  })
  @ApiResponse({
    status: 200,
    description: '权限树',
    type: [PermissionTreeDto],
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  async getTree(): Promise<PermissionTreeDto[]> {
    return this.permissionService.getTree();
  }

  @Get(':id')
  @ApiOperation({
    summary: '获取权限详情',
    description: '根据 ID 获取权限详情',
  })
  @ApiParam({
    name: 'id',
    description: '权限 ID',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 200,
    description: '权限详情',
    type: PermissionTreeDto,
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  @ApiResponse({
    status: 404,
    description: '权限不存在',
  })
  async findById(@Param('id') id: string): Promise<PermissionTreeDto> {
    return this.permissionService.findById(id);
  }

  @Get('code/:code')
  @ApiOperation({
    summary: '根据编码获取权限',
    description: '根据权限编码获取权限详情',
  })
  @ApiParam({
    name: 'code',
    description: '权限编码',
    example: 'user:read',
  })
  @ApiResponse({
    status: 200,
    description: '权限详情',
    type: PermissionTreeDto,
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  @ApiResponse({
    status: 404,
    description: '权限不存在',
  })
  async findByCode(@Param('code') code: string): Promise<PermissionTreeDto> {
    return this.permissionService.findByCode(code);
  }

  @Put(':id')
  @ApiOperation({
    summary: '更新权限',
    description: '更新权限信息',
  })
  @ApiParam({
    name: 'id',
    description: '权限 ID',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 200,
    description: '权限更新成功',
    type: PermissionTreeDto,
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
    description: '权限不存在',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePermissionDto,
  ): Promise<PermissionTreeDto> {
    return this.permissionService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '删除权限',
    description: '删除权限',
  })
  @ApiParam({
    name: 'id',
    description: '权限 ID',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 204,
    description: '权限删除成功',
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  @ApiResponse({
    status: 404,
    description: '权限不存在',
  })
  async delete(@Param('id') id: string): Promise<void> {
    return this.permissionService.delete(id);
  }
}
