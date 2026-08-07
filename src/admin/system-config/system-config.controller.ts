import { Controller, Get, Put, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SystemConfigService } from './system-config.service';
import { UpdateMailConfigDto } from './dto/mail-config.dto';
import { UpdateWechatShopConfigDto } from './dto/wechat-shop-config.dto';
import { RequirePermissions } from '@/permission/decorators/permissions.decorator';

@ApiTags('Admin / System Config')
@ApiBearerAuth()
@Controller('admin/system-config')
export class SystemConfigController {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  @Get('mail')
  @ApiOperation({ summary: 'Get global mail configuration' })
  @RequirePermissions('system:config:read')
  async getMailConfig() {
    return this.systemConfigService.getMailConfig();
  }

  @Put('mail')
  @ApiOperation({ summary: 'Update global mail configuration' })
  @RequirePermissions('system:config:write')
  async updateMailConfig(@Body() dto: UpdateMailConfigDto) {
    return this.systemConfigService.updateMailConfig(dto);
  }

  @Get('wechat-shop')
  @ApiOperation({ summary: 'Get global wechat shop configuration' })
  @RequirePermissions('system:config:read')
  async getWechatShopConfig() {
    return this.systemConfigService.getWechatShopConfig();
  }

  @Put('wechat-shop')
  @ApiOperation({ summary: 'Update global wechat shop configuration' })
  @RequirePermissions('system:config:write')
  async updateWechatShopConfig(@Body() dto: UpdateWechatShopConfigDto) {
    return this.systemConfigService.updateWechatShopConfig(dto);
  }
}

