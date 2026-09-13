/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-04 18:05:33
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-09-04 16:35:00
 * @FilePath: /nove_api/src/admin/api-key/controllers/api-key.controller.ts
 * @Description: API Key 管理控制器
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
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
import { RequirePermissions } from '@/admin/permission/decorators/permissions.decorator';
import { RequireAuth } from '@/auth/decorators/require-auth.decorator';
import { Auth } from '@/auth/decorators/auth.decorator';
import { ApiKeyService } from '../services/api-key.service';
import { UserOrgService } from '../services/user-organization.service';
import {
  CreateApiKeyDto,
  UpdateApiKeyDto,
  PaginationDto,
  CreateApiKeyResponse,
  ApiKeyDto,
  ApiKeyListResponse,
  RotateApiKeyResponse,
} from '../dto';

/**
 * API Key 控制器
 * 处理 API Key 的 CRUD 操作
 * 所有接口都需要 JWT 认证和相应的权限
 */
@ApiTags('Admin / API Key')
@ApiBearerAuth()
@RequireAuth('jwt')
@Controller('admin/api-keys')
export class ApiKeyController {
  constructor(
    private readonly apiKeyService: ApiKeyService,
    private readonly userOrgService: UserOrgService,
  ) {}

  /**
   * 创建 API Key
   */
  @Post()
  @ApiOperation({
    summary: '创建 API Key',
    description:
      '为当前用户在主组织下创建新的 API Key。明文 key 仅在创建成功时返回一次，之后无法再次查看。',
  })
  @ApiResponse({
    status: 201,
    description: 'API Key 创建成功',
    type: CreateApiKeyResponse,
  })
  @ApiResponse({
    status: 400,
    description: '请求参数无效',
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  @RequirePermissions('api-key:create')
  async createKey(
    @Auth('userId') userId: string,
    @Body() dto: CreateApiKeyDto,
  ): Promise<CreateApiKeyResponse> {
    const organizationId = await this.userOrgService.getPrimaryOrgId(userId);

    return this.apiKeyService.createKey(organizationId, userId, dto);
  }

  /**
   * 列出 API Keys
   */
  @Get()
  @ApiOperation({
    summary: '列出 API Keys',
    description: '获取当前组织的所有 API Keys（分页），支持按状态筛选',
  })
  @ApiResponse({
    status: 200,
    description: 'API Keys 列表',
    type: ApiKeyListResponse,
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  @RequirePermissions('api-key:read')
  async listKeys(
    @Auth('userId') userId: string,
    @Query() pagination: PaginationDto,
  ): Promise<ApiKeyListResponse> {
    const organizationId = await this.userOrgService.getPrimaryOrgId(userId);

    return this.apiKeyService.listKeys(organizationId, pagination, userId);
  }

  /**
   * 更新 API Key
   */
  @Patch(':id')
  @ApiOperation({
    summary: '更新 API Key',
    description: '更新 API Key 的名称、权限范围或过期时间',
  })
  @ApiParam({
    name: 'id',
    description: 'API Key ID',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 200,
    description: 'API Key 更新成功',
    type: ApiKeyDto,
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
    description: 'API Key 不存在',
  })
  @RequirePermissions('api-key:update')
  async updateKey(
    @Auth('userId') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateApiKeyDto,
  ): Promise<ApiKeyDto> {
    const organizationId = await this.userOrgService.getPrimaryOrgId(userId);

    return this.apiKeyService.updateKey(organizationId, id, dto, userId);
  }

  /**
   * 撤销 API Key
   */
  @Post(':id/revoke')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '撤销 API Key',
    description: '立即撤销 API Key，使其无法再用于认证',
  })
  @ApiParam({
    name: 'id',
    description: 'API Key ID',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 204,
    description: 'API Key 撤销成功',
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  @ApiResponse({
    status: 404,
    description: 'API Key 不存在',
  })
  @RequirePermissions('api-key:revoke')
  async revokeKey(
    @Auth('userId') userId: string,
    @Param('id') id: string,
  ): Promise<void> {
    const organizationId = await this.userOrgService.getPrimaryOrgId(userId);

    await this.apiKeyService.revokeKey(organizationId, id, userId);
  }

  /**
   * 轮换 API Key
   */
  @Post(':id/rotate')
  @ApiOperation({
    summary: '轮换 API Key',
    description:
      '生成新的 API Key 并自动撤销旧 Key。新 Key 保留原有的名称和权限范围。明文 key 仅在此响应中返回一次。',
  })
  @ApiParam({
    name: 'id',
    description: 'API Key ID',
    example: 'clx1234567890abcdef',
  })
  @ApiResponse({
    status: 200,
    description: 'API Key 轮换成功',
    type: RotateApiKeyResponse,
  })
  @ApiResponse({
    status: 401,
    description: '未授权',
  })
  @ApiResponse({
    status: 404,
    description: 'API Key 不存在',
  })
  @RequirePermissions('api-key:rotate')
  async rotateKey(
    @Auth('userId') userId: string,
    @Param('id') id: string,
  ): Promise<RotateApiKeyResponse> {
    const organizationId = await this.userOrgService.getPrimaryOrgId(userId);

    return this.apiKeyService.rotateKey(organizationId, id, userId);
  }
}
