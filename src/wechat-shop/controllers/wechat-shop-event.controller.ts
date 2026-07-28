import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { generateSignature, decryptWechatMessage } from '../utils/wechat-crypto.util';
import { Public } from '@/auth/decorators/public.decorator';
import { WechatShopService } from '../service/wechat-shop.service';
import {
  WechatEventQueryDto,
  WechatEventBodyDto,
} from '../dto/wechat-event-webhook.dto';

@ApiTags('Wechat Shop Events')
@Controller('webhooks/wechat-shop/events')
export class WechatShopEventController {
  constructor(
    private readonly wechatShopService: WechatShopService,
    private readonly configService: ConfigService,
  ) { }

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Verify WeChat webhook URL',
    description: '用于接收并响应微信小店事件推送服务器的 URL 验证请求。',
  })
  verifyWebhook(
    @Query('signature') signature: string,
    @Query('timestamp') timestamp: string,
    @Query('nonce') nonce: string,
    @Query('echostr') echostr: string,
  ) {
    const token = this.configService.get<string>('WECHAT_SHOP_WEBHOOK_TOKEN');

    if (!token) {
      throw new UnauthorizedException('WeChat webhook token is not configured');
    }

    const hash = generateSignature(token, timestamp, nonce);

    // 3. 开发者获得加密后的字符串可与 signature 对比，标识该请求来源于微信
    if (hash !== signature) {
      throw new UnauthorizedException('Invalid signature');
    }

    // 4. 若确认此次 GET 请求来自微信服务器，请原样返回 echostr 参数内容
    return echostr;
  }

  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive WeChat shop events',
    description:
      '接收微信小店的各类事件推送（如订单、售后、商品等），并进行统一验证、解密和分发。',
  })
  async receiveEvent(
    @Query() query: WechatEventQueryDto,
    @Body() payload: WechatEventBodyDto,
  ) {
    const token = this.configService.get<string>('WECHAT_SHOP_WEBHOOK_TOKEN');
    const encodingAesKey = this.configService.get<string>(
      'WECHAT_SHOP_ENCODING_AES_KEY',
    );
    const appId = this.configService.get<string>('WECHAT_SHOP_APP_ID');

    if (!token || !encodingAesKey || !appId) {
      throw new UnauthorizedException(
        'WeChat webhook configuration is missing',
      );
    }

    const encryptRaw = payload.Encrypt;
    const encrypt = typeof encryptRaw === 'string' ? encryptRaw : '';
    if (!encrypt) {
      throw new UnauthorizedException('Missing Encrypt field');
    }

    // 1. 验证签名，确保事件来自微信
    const hash = generateSignature(encrypt, query.timestamp, query.nonce, token);

    if (hash !== query.msg_signature) {
      throw new UnauthorizedException('Invalid msg_signature');
    }

    // 2. 解密 payload 中的 Encrypt 字段
    let decryptedMsg: Record<string, unknown>;
    try {
      decryptedMsg = decryptWechatMessage(encrypt, encodingAesKey, appId);
    } catch (error) {
      throw new UnauthorizedException(
        'Failed to decrypt message: ' + (error as Error).message,
      );
    }

    // 3. 根据解密后的 Event 字段进行路由分发处理
    try {
      const eventType = decryptedMsg.Event;

      if (eventType === 'channels_ec_order_pay') {
        const orderInfo = decryptedMsg.order_info as Record<string, unknown>;
        const orderId = String(orderInfo?.order_id ?? '');
        if (orderId) {
          await this.wechatShopService.syncSingleOrder(orderId);
        }
      } else if (eventType === 'channels_ec_aftersale_update') {
        const aftersaleInfo = decryptedMsg.finder_shop_aftersale_status_update as Record<string, unknown>;
        const orderId = String(aftersaleInfo?.order_id ?? '');
        if (orderId) {
          await this.wechatShopService.syncSingleOrder(orderId);
        }
      }
    } catch (err) {
      // 记录错误但不抛出异常，为了能够向微信返回 success，避免微信持续重试
      console.error(`Failed to process WeChat event [${decryptedMsg.Event}]:`, err);
    }

    // 微信要求成功接收后返回 'success'
    return 'success';
  }

}
