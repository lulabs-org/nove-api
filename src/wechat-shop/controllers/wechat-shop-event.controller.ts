import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { wechatShopConfig, WechatShopConfig } from '@/configs';
import {
  generateSignature,
  decryptWechatMessage,
} from '../utils/wechat-crypto.util';
import { Public } from '@/auth/decorators/public.decorator';
import { WechatShopEventService } from '../service/wechat-shop-event.service';
import {
  WechatEventQueryDto,
  WechatEventBodyDto,
} from '../dto/wechat-event-webhook.dto';

@ApiTags('Wechat Shop Events')
@Controller('webhooks/wechat-shop/events')
export class WechatShopEventController {
  constructor(
    private readonly wechatShopEventService: WechatShopEventService,
    @Inject(wechatShopConfig.KEY) private readonly config: WechatShopConfig,
  ) {}

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
    const token = this.config.webhookToken;

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
    const { webhookToken: token, encodingAesKey, appId } = this.config;

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
    const hash = generateSignature(
      encrypt,
      query.timestamp,
      query.nonce,
      token,
    );

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

    // 3. 将解密后的事件传递给 Service 统一处理
    await this.wechatShopEventService.handleWechatEvent(decryptedMsg);

    // 微信要求成功接收后返回 'success'
    return 'success';
  }
}
