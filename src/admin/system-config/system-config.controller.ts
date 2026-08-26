import { Controller, Get, Put, Delete, Body, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { SystemConfigService } from './system-config.service';
import { RequirePermissions } from '@/admin/permission/decorators/permissions.decorator';

@ApiTags('Admin / System Config')
@ApiBearerAuth()
@Controller('admin/system-config')
export class SystemConfigController {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  @Get(':module')
  @ApiOperation({ summary: 'Get global configuration for a specific module' })
  @ApiParam({
    name: 'module',
    description: 'Module name (e.g., mail, wechat-shop)',
    example: 'mail',
  })
  @RequirePermissions('system:config:read')
  async getConfig(@Param('module') module: string) {
    return this.systemConfigService.getConfig(module);
  }

  @Put(':module')
  @ApiOperation({
    summary: 'Update global configuration for a specific module',
  })
  @ApiParam({
    name: 'module',
    description: 'Module name (e.g., mail, wechat-shop)',
    example: 'mail',
  })
  @RequirePermissions('system:config:write')
  async updateConfig(
    @Param('module') module: string,
    @Body() data: Record<string, unknown>,
  ) {
    return this.systemConfigService.updateConfig(module, data);
  }

  @Delete(':module')
  @ApiOperation({ summary: 'Delete module configuration' })
  @ApiParam({
    name: 'module',
    description: 'Module name (e.g., mail, wechat-shop)',
    example: 'mail',
  })
  @RequirePermissions('system:config:write')
  async deleteConfig(@Param('module') module: string) {
    return this.systemConfigService.deleteConfig(module);
  }
}
