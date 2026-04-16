import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '@/auth/decorators/public.decorator';
import { WechatOrderWebhookDto } from './dto/wechat-order-webhook.dto';
import { OrderService } from './order.service';

@ApiTags('Orders')
@Controller('webhooks/wechat/orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive WeChat order payload and persist mapped fields',
    description:
      '接收微信小店订单字段，并将当前可直接映射的字段写入 orders 表。',
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
}
