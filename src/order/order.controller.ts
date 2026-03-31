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
    examples: {
      simple: {
        summary: 'Simple WeChat order payload',
        value: {
          order_id: 'wx_order_202603260001',
          status: 'PAID',
          create_time: '2026-03-26T10:00:00+08:00',
          update_time: '2026-03-26T10:30:00+08:00',
          price_info: {
            order_price: 10500,
            product_price: 20000,
            freight: 500,
            discounted_price: 10000,
          },
          pay_info: {
            transaction_id: '4200001234202603261234567890',
            payment_method: 'WECHAT_PAY',
            pay_time: '2026-03-26T10:05:00+08:00',
          },
          delivery_info: {
            address_info: {
              user_name: '陈先生',
              province_name: '广东',
              city_name: '广州',
              tel_number: '13800138000',
            },
          },
          product_infos: [
            {
              product_id: 'prod_10001',
              title: '微信小店体验课',
            },
          ],
        },
      },
      getOrderStyle: {
        summary: 'WeChat getorder style payload',
        value: {
          order_id: '37423523451235145',
          status: 20,
          create_time: 1658505600,
          update_time: 1658509200,
          openid: 'OPENID',
          unionid: 'UNIONID',
          order_detail: {
            product_infos: [
              {
                product_id: '234245',
                sku_id: '23424',
                title: '健身环',
              },
            ],
            pay_info: {
              transaction_id: '131456479687',
              prepay_time: 1658509100,
              pay_time: 1658509200,
              payment_method: 1,
            },
            price_info: {
              product_price: 20000,
              order_price: 10500,
              freight: 500,
              discounted_price: 10000,
            },
            delivery_info: {
              address_info: {
                user_name: '陈先生',
                province_name: '广东',
                city_name: '广州',
                tel_number: '13800138000',
              },
            },
          },
        },
      },
    },
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
