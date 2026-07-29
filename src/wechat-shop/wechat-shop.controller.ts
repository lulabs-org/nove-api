import {
  Body,
  Controller,
  Get,
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
import { WechatShopEncryptedWebhookPayload } from './types/wechat-shop.types';

interface WechatWebhookSignatureQuery {
  /** 微信安全模式签名，计算时包含请求体中的 Encrypt 密文。 */
  msg_signature?: string;
  /** 微信生成签名时使用的秒级时间戳。 */
  timestamp?: string;
  /** 微信生成签名时使用的随机字符串。 */
  nonce?: string;
}

interface WechatWebhookVerificationQuery {
  /** 微信配置回调 URL 时生成的普通签名。 */
  signature?: string;
  /** 微信生成签名时使用的秒级时间戳。 */
  timestamp?: string;
  /** 微信生成签名时使用的随机字符串。 */
  nonce?: string;
}

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('webhooks/wechat/orders')
export class WechatShopController {
  constructor(private readonly wechatShopService: WechatShopService) {}

  /**
   * 备用的微信小店回调 URL 验证入口。
   *
   * 当前生产链路由飞书完成 GET 验证；如果以后微信改为直连本项目，
   * 可将此地址配置到微信后台。接口使用普通 signature 验签，并在成功后
   * 原样返回 echostr。
   */
  @Public()
  @Get('aftersales')
  @ApiOperation({
    summary: 'Verify WeChat shop aftersale callback URL',
    description:
      '备用直连入口：验证微信回调 URL 的 signature，并原样返回 echostr。',
  })
  @ApiResponse({ status: 200, description: '回调 URL 验证成功' })
  verifyWechatAftersaleCallback(
    @Query() query: WechatWebhookVerificationQuery,
    @Query('echostr') echoString?: string,
  ) {
    return this.wechatShopService.verifyWechatWebhookEcho(query, echoString);
  }

  /**
   * 接收飞书集成平台转发的微信小店售后加密通知。
   *
   * 飞书不会携带本项目的 JWT 或 API Key，因此该入口使用 @Public() 跳过
   * 项目认证；请求安全性由微信 msg_signature 验签、AES 解密和 AppID
   * 校验共同保证。飞书必须原样转发查询参数和 Encrypt，不能改写密文。
   */
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
    @Body() payload: WechatShopEncryptedWebhookPayload,
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

  /**
   * 接收飞书集成平台已经映射成内部字段的订单。
   *
   * 该接口会按外部订单号执行 upsert：订单不存在时创建，存在时更新，
   * 所以调用方必须同时具备 order:create 和 order:update 权限。
   * 飞书调用时应携带包含相应 scope 的 API Key，不能匿名调用。
   */
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

  /**
   * 主动补同步指定时间范围内的微信小店历史订单。
   *
   * 同步过程会调用微信列表/详情接口并批量创建或更新订单，也会解析订单
   * 携带的退款信息，因此属于受保护的管理操作，不能使用 @Public()。
   */
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

  /**
   * 主动补同步指定时间范围内的微信小店历史售后单。
   *
   * 该接口用于首次补数、Webhook 漏推补偿和数据核对。它会分页拉取售后
   * 详情并写入 order_refunds，因此要求 order:update 权限。
   */
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
