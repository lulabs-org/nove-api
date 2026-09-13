import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { NoPermissionRequired } from '@/admin/permission/decorators/permissions.decorator';
import { RequireRoles } from '@/admin/role/decorators/roles.decorator';
import {
  WechatAftersaleHistorySyncDto,
  WechatAftersaleListQueryDto,
  WechatOrderHistorySyncDto,
} from '../dto';
import {
  WechatShopAftersaleService,
  WechatShopOrderService,
} from '../services';

@ApiTags('Wechat Shop')
@ApiBearerAuth()
@Controller('wechat-shop/orders')
export class WechatShopOrderController {
  constructor(
    private readonly wechatShopOrderService: WechatShopOrderService,
    private readonly wechatShopAftersaleService: WechatShopAftersaleService,
  ) {}

  @RequireRoles('SUPER_ADMIN')
  @NoPermissionRequired()
  @Post('history-sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sync historical orders',
    description:
      '后台按 7 天时间片分页拉取微信小店历史订单并分发异步任务写入 orders 表，最大支持 1 年跨度。',
  })
  @ApiBody({
    type: WechatOrderHistorySyncDto,
  })
  @ApiResponse({ status: 200, description: '历史订单同步任务下发完成' })
  async syncHistory(@Body() payload: WechatOrderHistorySyncDto) {
    const result = await this.wechatShopOrderService.syncHistory(payload);

    return {
      success: true,
      result,
    };
  }

  @RequireRoles('SUPER_ADMIN')
  @NoPermissionRequired()
  @Post('aftersale/history-sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sync historical aftersale orders',
    description:
      '后台按 24 小时时间片分页拉取微信小店历史售后单并分发异步任务写入 refunds 表，最大支持 1 年跨度。',
  })
  @ApiBody({
    type: WechatAftersaleHistorySyncDto,
  })
  @ApiResponse({ status: 200, description: '历史售后订单同步任务下发完成' })
  async syncAftersaleHistory(@Body() payload: WechatAftersaleHistorySyncDto) {
    const result = await this.wechatShopAftersaleService.syncHistory(payload);

    return {
      success: true,
      result,
    };
  }

  @RequireRoles('SUPER_ADMIN')
  @NoPermissionRequired()
  @Post('aftersale/list')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get aftersale orders list',
    description:
      '批量获取微信小店售后历史订单列表（单次查询时间跨度不超过 24 小时，支持秒级时间戳或 ISO 8601 时间范围）。',
  })
  @ApiBody({
    type: WechatAftersaleListQueryDto,
  })
  @ApiResponse({ status: 200, description: '获取售后单列表成功' })
  async getAftersaleList(@Body() query: WechatAftersaleListQueryDto) {
    const result =
      await this.wechatShopAftersaleService.getAftersaleList(query);

    return {
      success: true,
      result,
    };
  }
}
