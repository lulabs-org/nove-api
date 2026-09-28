import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { RequirePermissions } from '@/admin/permission/decorators/permissions.decorator';
import { CurrentOrg } from '@/auth/decorators';

import {
  OrganizationLogoUploadFile,
  OrganizationProfileService,
  OrganizationService,
} from '../services';
import {
  CreateOrganizationDto,
  OrganizationDto,
  OrganizationListResponse,
  OrganizationProfileDto,
  OrganizationStatsDto,
  PaginationDto,
  UpdateOrganizationDto,
  UpdateStatusDto,
} from '../dto';

@ApiTags('Admin / Organizations')
@ApiBearerAuth()
@ApiExtraModels(OrganizationProfileDto)
@Controller('admin/orgs')
export class OrganizationController {
  constructor(
    private readonly organizationService: OrganizationService,
    private readonly organizationProfileService: OrganizationProfileService,
  ) {}

  @Post()
  @ApiOperation({
    summary: '创建组织',
    description: '创建新的组织',
  })
  @ApiResponse({
    status: 201,
    description: '组织创建成功',
    type: OrganizationDto,
  })
  @ApiResponse({
    status: 400,
    description: '请求参数无效',
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  @RequirePermissions('org:create')
  async createOrganization(
    @Body() dto: CreateOrganizationDto,
  ): Promise<OrganizationDto> {
    return this.organizationService.createOrganization(dto);
  }

  @Get()
  @ApiOperation({
    summary: '组织列表',
    description: '获取组织列表（支持分页和关键字搜索）',
  })
  @ApiResponse({
    status: 200,
    description: '组织列表',
    type: OrganizationListResponse,
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  @RequirePermissions('org:read')
  async listOrganizations(
    @Query() pagination: PaginationDto,
  ): Promise<OrganizationListResponse> {
    return this.organizationService.listOrganizations(pagination);
  }

  @Get(':orgId')
  @ApiOperation({
    summary: '组织详情',
    description: '根据组织 ID 获取组织详细信息',
  })
  @ApiParam({
    name: 'orgId',
    description: '组织 ID',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 200,
    description: '组织详情',
    type: OrganizationDto,
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  @ApiResponse({
    status: 404,
    description: '组织不存在',
  })
  @RequirePermissions('org:read')
  async getOrganization(
    @Param('orgId') orgId: string,
  ): Promise<OrganizationDto> {
    return this.organizationService.getOrganization(orgId);
  }

  @Put(':orgId')
  @ApiOperation({
    summary: '更新组织信息',
    description: '更新组织的名称、logo、域名、联系人等信息',
  })
  @ApiParam({
    name: 'orgId',
    description: '组织 ID',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 200,
    description: '组织更新成功',
    type: OrganizationDto,
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
    description: '组织不存在',
  })
  @RequirePermissions('org:update')
  async updateOrganization(
    @Param('orgId') orgId: string,
    @Body() dto: UpdateOrganizationDto,
  ): Promise<OrganizationDto> {
    return this.organizationService.updateOrganization(orgId, dto);
  }

  @Patch(':orgId/status')
  @ApiOperation({
    summary: '启用/停用组织',
    description: '更新组织的启用状态',
  })
  @ApiParam({
    name: 'orgId',
    description: '组织 ID',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 200,
    description: '状态更新成功',
    type: OrganizationDto,
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
    description: '组织不存在',
  })
  @RequirePermissions('org:update')
  async updateStatus(
    @Param('orgId') orgId: string,
    @Body() dto: UpdateStatusDto,
  ): Promise<OrganizationDto> {
    return this.organizationService.updateStatus(orgId, dto.active);
  }

  @Delete(':orgId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '删除组织',
    description: '删除组织（软删除）',
  })
  @ApiParam({
    name: 'orgId',
    description: '组织 ID',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 204,
    description: '组织删除成功',
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  @ApiResponse({
    status: 404,
    description: '组织不存在',
  })
  @RequirePermissions('org:delete')
  async deleteOrganization(@Param('orgId') orgId: string): Promise<void> {
    await this.organizationService.deleteOrganization(orgId);
  }

  @Get(':orgId/stats')
  @ApiOperation({
    summary: '组织统计',
    description: '获取组织的统计信息（人数、部门数、禁用人数等）',
  })
  @ApiParam({
    name: 'orgId',
    description: '组织 ID',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 200,
    description: '组织统计信息',
    type: OrganizationStatsDto,
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  @ApiResponse({
    status: 404,
    description: '组织不存在',
  })
  @RequirePermissions('org:read')
  async getOrganizationStats(
    @Param('orgId') orgId: string,
  ): Promise<OrganizationStatsDto> {
    return this.organizationService.getOrganizationStats(orgId);
  }

  @Put(':orgId/profile')
  @RequirePermissions('org:update')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    }),
  )
  @ApiOperation({ summary: '保存企业信息及上传的 Logo' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      allOf: [
        { $ref: getSchemaPath(OrganizationProfileDto) },
        {
          type: 'object',
          properties: { file: { type: 'string', format: 'binary' } },
        },
      ],
    },
  })
  @ApiResponse({ status: 200, type: OrganizationDto })
  async saveProfile(
    @CurrentOrg() currentOrgId: string,
    @Param('orgId') orgId: string,
    @Body() dto: OrganizationProfileDto,
    @UploadedFile() file?: OrganizationLogoUploadFile,
  ): Promise<OrganizationDto> {
    if (currentOrgId !== orgId)
      throw new ForbiddenException('只能修改当前企业的信息');
    return this.organizationProfileService.save(orgId, dto, file);
  }
}
