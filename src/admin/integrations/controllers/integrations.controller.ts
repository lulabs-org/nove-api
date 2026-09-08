import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { RequirePermissions } from '@/admin/permission/decorators/permissions.decorator';
import { CurrentOrg } from '@/auth/decorators';
import { IntegrationsService, IntegrationTesterService } from '../services';
import {
  IntegrationDetailResponseDto,
  IntegrationMutationResponseDto,
  IntegrationSummaryResponseDto,
  TestIntegrationResponseDto,
} from '../dto';

@ApiTags('Admin / Integrations')
@ApiBearerAuth()
@Controller('admin/integrations')
export class IntegrationsController {
  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly integrationTester: IntegrationTesterService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List organization integrations configuration status',
  })
  @ApiResponse({
    status: 200,
    description: '返回所有集成模块的配置状态列表',
    type: [IntegrationSummaryResponseDto],
  })
  @RequirePermissions('system:config:read')
  async list(@CurrentOrg() orgId: string) {
    return this.integrationsService.listIntegrations(orgId);
  }

  @Get(':module')
  @ApiOperation({
    summary: 'Get organization integration configuration for a module',
  })
  @ApiParam({
    name: 'module',
    description: 'Module name (e.g., mail, wechat-shop)',
    example: 'mail',
  })
  @ApiResponse({
    status: 200,
    description: '返回掩码后的模块有效配置详情',
    type: IntegrationDetailResponseDto,
  })
  @RequirePermissions('system:config:read')
  async get(@CurrentOrg() orgId: string, @Param('module') module: string) {
    return this.integrationsService.getIntegration(orgId, module);
  }

  @Put(':module')
  @ApiOperation({
    summary: 'Update organization integration configuration for a module',
  })
  @ApiParam({
    name: 'module',
    description: 'Module name (e.g., mail, wechat-shop)',
    example: 'mail',
  })
  @ApiResponse({
    status: 200,
    description: '更新并持久化模块配置，返回生效状态',
    type: IntegrationMutationResponseDto,
  })
  @RequirePermissions('system:config:write')
  async update(
    @CurrentOrg() orgId: string,
    @Param('module') module: string,
    @Body() data: Record<string, unknown>,
  ) {
    return this.integrationsService.updateIntegration(orgId, module, data);
  }

  @Post(':module/test')
  @ApiOperation({ summary: 'Test a draft integration configuration' })
  @ApiParam({
    name: 'module',
    description: 'Module name (e.g., mail, wechat-shop)',
    example: 'mail',
  })
  @ApiResponse({
    status: 200,
    description: '草稿连通性测试结果',
    type: TestIntegrationResponseDto,
  })
  @RequirePermissions('system:config:write')
  async test(
    @CurrentOrg() orgId: string,
    @Param('module') module: string,
    @Body() data: Record<string, unknown>,
  ) {
    return this.integrationTester.testIntegration(orgId, module, data);
  }

  @Delete(':module')
  @ApiOperation({ summary: 'Delete organization integration configuration' })
  @ApiParam({
    name: 'module',
    description: 'Module name (e.g., mail, wechat-shop)',
    example: 'mail',
  })
  @ApiResponse({
    status: 200,
    description: '已删除数据库配置并重置为默认值',
    type: IntegrationMutationResponseDto,
  })
  @RequirePermissions('system:config:write')
  async remove(@CurrentOrg() orgId: string, @Param('module') module: string) {
    return this.integrationsService.deleteIntegration(orgId, module);
  }
}
