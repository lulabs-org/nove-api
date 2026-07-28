import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '@/auth/decorators/public.decorator';
import {
  RequireAllPermissions,
  RequirePermissions,
} from '@/permission/decorators/permissions.decorator';
import { WechatOrderHistorySyncDto } from './dto/wechat-order-history-sync.dto';
import { WechatOrderWebhookDto } from './dto/wechat-order-webhook.dto';
import { WechatShopService } from './service/wechat-shop.service';
import {
  WechatShopAftersaleUpdateWebhookPayload,
  WechatShopEncryptedWebhookPayload,
} from './types/wechat-shop.types';

interface WechatWebhookSignatureQuery {
  signature?: string;
  msg_signature?: string;
  timestamp?: string;
  nonce?: string;
}

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('webhooks/wechat/orders')
export class WechatShopController {
  constructor(private readonly wechatShopService: WechatShopService) {}

  @Public()
  @Post('aftersales')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive WeChat shop aftersale update callback',
    description:
      '接收微信小店售后单状态更新通知，并按售后单号拉取详情后同步退款记录。',
  })
  @ApiResponse({ status: 200, description: '售后单通知处理成功' })
  async receiveWechatAftersaleCallback(
    @Body()
    payload:
      | WechatShopAftersaleUpdateWebhookPayload
      | WechatShopEncryptedWebhookPayload,
    @Query() query: WechatWebhookSignatureQuery,
  ) {
    const decryptedPayload =
      this.wechatShopService.decryptWechatAftersaleWebhookPayload(
        payload,
        query,
      );
    await this.wechatShopService.syncWechatAftersaleWebhook(decryptedPayload);

    return 'success';
  }

  @RequireAllPermissions('order:create', 'order:update')
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
    const result = await this.wechatShopService.upsertWechatOrder(payload);

    return {
      success: true,
      action: result.action,
      orderId: result.order.id,
      orderCode: result.order.orderCode,
      orderNumber: result.order.orderNumber,
      externalId: result.order.externalId,
    };
  }

  @RequireAllPermissions('order:create', 'order:update')
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
    const result = await this.wechatShopService.syncWechatOrderHistory(payload);

    return {
      success: true,
      result,
    };
  }

  @RequirePermissions('order:update')
  @Post('aftersales/history-sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sync historical WeChat shop aftersales',
    description:
      '按 7 天时间片分页拉取微信小店售后单，并同步写入 order_refunds 表。',
  })
  @ApiBody({
    type: WechatOrderHistorySyncDto,
  })
  @ApiResponse({ status: 200, description: '售后单同步完成' })
  async syncWechatAftersaleHistory(@Body() payload: WechatOrderHistorySyncDto) {
    const result =
      await this.wechatShopService.syncWechatAftersaleHistory(payload);

    return {
      success: true,
      result,
    };
  }
}
