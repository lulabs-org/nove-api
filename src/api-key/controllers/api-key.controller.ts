import {
  Controller,
  Get,
  Post,
  Patch,
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
import { User, CurrentUser } from '@/auth/decorators/user.decorator';
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
 * API Key 管理控制器（管理端）
 * 需要 JWT 认证和 api_keys:manage 权限
 */
@ApiTags('Admin - API Keys')
@Controller('admin/api-keys')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
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
    description: '为当前组织创建新的 API Key。明文 key 仅在此响应中返回一次。',
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
  async createKey(
    @User() user: CurrentUser,
    @Body() dto: CreateApiKeyDto,
  ): Promise<CreateApiKeyResponse> {
    const organizationId = await this.userOrgService.getPrimaryOrgId(user.id);

    return this.apiKeyService.createKey(organizationId, user.id, dto);
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
  async listKeys(
    @User() user: CurrentUser,
    @Query() pagination: PaginationDto,
  ): Promise<ApiKeyListResponse> {
    const organizationId = await this.userOrgService.getPrimaryOrgId(user.id);

    return this.apiKeyService.listKeys(organizationId, pagination, user.id);
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
  async updateKey(
    @User() user: CurrentUser,
    @Param('id') id: string,
    @Body() dto: UpdateApiKeyDto,
  ): Promise<ApiKeyDto> {
    const organizationId = await this.userOrgService.getPrimaryOrgId(user.id);

    return this.apiKeyService.updateKey(organizationId, id, dto, user.id);
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
  async revokeKey(
    @User() user: CurrentUser,
    @Param('id') id: string,
  ): Promise<void> {
    const organizationId = await this.userOrgService.getPrimaryOrgId(user.id);

    await this.apiKeyService.revokeKey(organizationId, id, user.id);
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
  async rotateKey(
    @User() user: CurrentUser,
    @Param('id') id: string,
  ): Promise<RotateApiKeyResponse> {
    const organizationId = await this.userOrgService.getPrimaryOrgId(user.id);

    return this.apiKeyService.rotateKey(organizationId, id, user.id);
  }
}
