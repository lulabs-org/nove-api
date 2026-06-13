import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '@/auth/decorators/public.decorator';
import { WechatOrderHistorySyncDto } from './dto/wechat-order-history-sync.dto';
import { WechatOrderWebhookDto } from './dto/wechat-order-webhook.dto';
import { OrderService } from './service/order.service';

@ApiTags('Orders')
@Controller('webhooks/wechat/orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive mapped WeChat order fields',
    description: '接收飞书集成平台转换后的订单字段，并写入 orders 表。',
  })
  @ApiBody({
    type: WechatOrderWebhookDto,
  })
  @ApiResponse({ status: 200, description: '订单写入成功' })
  async receiveWechatOrder(@Body() payload: WechatOrderWebhookDto) {
    const result = await this.orderService.upsertWechatOrder(payload);

    return {
      success: true,
      action: result.action,
      orderId: result.order.id,
      orderCode: result.order.orderCode,
      orderNumber: result.order.orderNumber,
      externalId: result.order.externalId,
    };
  }

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
  async syncWechatOrderHistory(@Body() payload: WechatOrderHistorySyncDto) {
    const result = await this.orderService.syncWechatOrderHistory(payload);

    return {
      success: true,
      result,
    };
  }
}
