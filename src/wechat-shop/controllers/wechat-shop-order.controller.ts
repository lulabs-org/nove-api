import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '@/auth/decorators/public.decorator';
import { WechatOrderHistorySyncDto } from '../dto/wechat-order-history-sync.dto';
import { WechatShopOrderService } from '../service/wechat-shop-order.service';

@ApiTags('Orders')
@Controller('wechat-shop/orders')
export class WechatShopOrderController {
  constructor(
    private readonly wechatShopOrderService: WechatShopOrderService,
  ) { }

  @Public()
  @Post('history-sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sync historical WeChat shop orders',
    description:
      '按 7 天时间片分页拉取微信小店历史订单，并直接写入或覆盖 orders 表。',
  })
  @ApiBody({
    type: WechatOrderHistorySyncDto,
  })
  @ApiResponse({ status: 200, description: '历史订单同步完成' })
  async syncHistory(@Body() payload: WechatOrderHistorySyncDto) {
    const result = await this.wechatShopOrderService.syncHistory(payload);

    return {
      success: true,
      result,
    };
  }
}
