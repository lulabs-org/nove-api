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
import { SystemConfigService, TesterService } from '../services';

@ApiTags('Admin / System Config')
@ApiBearerAuth()
@Controller('admin/system-config')
export class SystemConfigController {
  constructor(
    private readonly systemConfigService: SystemConfigService,
    private readonly systemConfigTester: TesterService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List organization service configuration status' })
  @RequirePermissions('system:config:read')
  async listConfigs(@Auth('orgId') orgId: string | null | undefined) {
    return this.systemConfigService.listConfigs(this.requireOrgId(orgId));
  }

  @Get(':module')
  @ApiOperation({ summary: 'Get organization configuration for a module' })
  @ApiParam({
    name: 'module',
    description: 'Module name (e.g., mail, wechat-shop)',
    example: 'mail',
  })
  @RequirePermissions('system:config:read')
  async getConfig(
    @Auth('orgId') orgId: string | null | undefined,
    @Param('module') module: string,
  ) {
    return this.systemConfigService.getConfig(this.requireOrgId(orgId), module);
  }

  @Put(':module')
  @ApiOperation({
    summary: 'Update organization configuration for a module',
  })
  @ApiParam({
    name: 'module',
    description: 'Module name (e.g., mail, wechat-shop)',
    example: 'mail',
  })
  @RequirePermissions('system:config:write')
  async updateConfig(
    @Auth('orgId') orgId: string | null | undefined,
    @Param('module') module: string,
    @Body() data: Record<string, unknown>,
  ) {
    return this.systemConfigService.updateConfig(
      this.requireOrgId(orgId),
      module,
      data,
    );
  }

  @Post(':module/test')
  @ApiOperation({ summary: 'Test a draft service configuration' })
  @RequirePermissions('system:config:write')
  async testConfig(
    @Auth('orgId') orgId: string | null | undefined,
    @Param('module') module: string,
    @Body() data: Record<string, unknown>,
  ) {
    return this.systemConfigTester.testConfig(
      this.requireOrgId(orgId),
      module,
      data,
    );
  }

  @Delete(':module')
  @ApiOperation({ summary: 'Delete module configuration' })
  @ApiParam({
    name: 'module',
    description: 'Module name (e.g., mail, wechat-shop)',
    example: 'mail',
  })
  @RequirePermissions('system:config:write')
  async deleteConfig(
    @Auth('orgId') orgId: string | null | undefined,
    @Param('module') module: string,
  ) {
    return this.systemConfigService.deleteConfig(
      this.requireOrgId(orgId),
      module,
    );
  }

  private requireOrgId(orgId: string | null | undefined): string {
    if (!orgId) {
      throw new ForbiddenException('Organization context is required');
    }
    return orgId;
  }
}
