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
import { PermService } from '../services/permission.service';
import {
  CreateDataPermissionRuleDto,
  UpdateDataPermissionRuleDto,
  QueryDataPermissionRuleDto,
  DataPermissionRuleDto,
  DataPermissionRuleListResponse,
} from '../dto';

@ApiTags('Admin - Data Permission Rules')
@Controller('admin/data-permission-rules')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DataPermissionRuleController {
  constructor(private readonly permService: PermService) {}

  @Post()
  @ApiOperation({
    summary: '创建数据权限规则',
    description: '创建新的数据权限规则',
  })
  @ApiResponse({
    status: 201,
    description: '数据权限规则创建成功',
    type: DataPermissionRuleDto,
  })
  @ApiResponse({
    status: 400,
    description: '请求参数无效',
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  async create(
    @Body() dto: CreateDataPermissionRuleDto,
  ): Promise<DataPermissionRuleDto> {
    return this.permService.createDataPermissionRule(dto);
  }

  @Get()
  @ApiOperation({
    summary: '列出数据权限规则',
    description: '获取数据权限规则列表（支持分页和筛选）',
  })
  @ApiResponse({
    status: 200,
    description: '数据权限规则列表',
    type: DataPermissionRuleListResponse,
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  async findAll(
    @Query() query: QueryDataPermissionRuleDto,
  ): Promise<DataPermissionRuleListResponse> {
    return this.permService.findAllDataPermissionRules(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: '获取数据权限规则详情',
    description: '根据 ID 获取数据权限规则详情',
  })
  @ApiParam({
    name: 'id',
    description: '数据权限规则 ID',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 200,
    description: '数据权限规则详情',
    type: DataPermissionRuleDto,
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  @ApiResponse({
    status: 404,
    description: '数据权限规则不存在',
  })
  async findById(@Param('id') id: string): Promise<DataPermissionRuleDto> {
    return this.permService.findDataPermissionRuleById(id);
  }

  @Get('code/:code')
  @ApiOperation({
    summary: '根据编码获取数据权限规则',
    description: '根据规则编码获取数据权限规则详情',
  })
  @ApiParam({
    name: 'code',
    description: '规则编码',
    example: 'dept_only',
  })
  @ApiResponse({
    status: 200,
    description: '数据权限规则详情',
    type: DataPermissionRuleDto,
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  @ApiResponse({
    status: 404,
    description: '数据权限规则不存在',
  })
  async findByCode(
    @Param('code') code: string,
  ): Promise<DataPermissionRuleDto> {
    return this.permService.findDataPermissionRuleByCode(code);
  }

  @Put(':id')
  @ApiOperation({
    summary: '更新数据权限规则',
    description: '更新数据权限规则信息',
  })
  @ApiParam({
    name: 'id',
    description: '数据权限规则 ID',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 200,
    description: '数据权限规则更新成功',
    type: DataPermissionRuleDto,
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
    description: '数据权限规则不存在',
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateDataPermissionRuleDto,
  ): Promise<DataPermissionRuleDto> {
    return this.permService.updateDataPermissionRule(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '删除数据权限规则',
    description: '删除数据权限规则',
  })
  @ApiParam({
    name: 'id',
    description: '数据权限规则 ID',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 204,
    description: '数据权限规则删除成功',
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  @ApiResponse({
    status: 404,
    description: '数据权限规则不存在',
  })
  async delete(@Param('id') id: string): Promise<void> {
    return this.permService.deleteDataPermissionRule(id);
  }
}
