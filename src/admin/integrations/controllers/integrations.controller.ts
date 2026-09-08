import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Post,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { RequirePermissions } from '@/admin/permission/decorators/permissions.decorator';
import { Auth } from '@/auth/decorators/auth.decorator';
import { IntegrationsService, IntegrationTesterService } from '../services';

@ApiTags('Admin / Integrations')
@ApiBearerAuth()
@Controller('admin/integrations')
export class IntegrationsController {
  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly integrationTester: IntegrationTesterService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List organization integrations configuration status' })
  @RequirePermissions('system:config:read')
  async list(@Auth('orgId') orgId: string | null | undefined) {
    return this.integrationsService.listIntegrations(this.requireOrgId(orgId));
  }

  listConfigs = this.list;

  @Get(':module')
  @ApiOperation({ summary: 'Get organization integration configuration for a module' })
  @ApiParam({
    name: 'module',
    description: 'Module name (e.g., mail, wechat-shop)',
    example: 'mail',
  })
  @RequirePermissions('system:config:read')
  async get(
    @Auth('orgId') orgId: string | null | undefined,
    @Param('module') module: string,
  ) {
    return this.integrationsService.getIntegration(this.requireOrgId(orgId), module);
  }

  getConfig = this.get;

  @Put(':module')
  @ApiOperation({
    summary: 'Update organization integration configuration for a module',
  })
  @ApiParam({
    name: 'module',
    description: 'Module name (e.g., mail, wechat-shop)',
    example: 'mail',
  })
  @RequirePermissions('system:config:write')
  async update(
    @Auth('orgId') orgId: string | null | undefined,
    @Param('module') module: string,
    @Body() data: Record<string, unknown>,
  ) {
    return this.integrationsService.updateIntegration(
      this.requireOrgId(orgId),
      module,
      data,
    );
  }

  updateConfig = this.update;

  @Post(':module/test')
  @ApiOperation({ summary: 'Test a draft integration configuration' })
  @RequirePermissions('system:config:write')
  async test(
    @Auth('orgId') orgId: string | null | undefined,
    @Param('module') module: string,
    @Body() data: Record<string, unknown>,
  ) {
    return this.integrationTester.testIntegration(
      this.requireOrgId(orgId),
      module,
      data,
    );
  }

  testConfig = this.test;

  @Delete(':module')
  @ApiOperation({ summary: 'Delete organization integration configuration' })
  @ApiParam({
    name: 'module',
    description: 'Module name (e.g., mail, wechat-shop)',
    example: 'mail',
  })
  @RequirePermissions('system:config:write')
  async remove(
    @Auth('orgId') orgId: string | null | undefined,
    @Param('module') module: string,
  ) {
    return this.integrationsService.deleteIntegration(
      this.requireOrgId(orgId),
      module,
    );
  }

  deleteConfig = this.remove;

  private requireOrgId(orgId: string | null | undefined): string {
    if (!orgId) {
      throw new ForbiddenException('Organization context is required');
    }
    return orgId;
  }
}

// Backward compatibility alias
export const SystemConfigController = IntegrationsController;
export type SystemConfigController = IntegrationsController;
