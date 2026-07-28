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
import { createHash } from 'node:crypto';
import { Public } from '@/auth/decorators/public.decorator';
import { WechatShopService } from '../service/wechat-shop.service';

@ApiTags('Wechat Shop Events')
@Controller('webhooks/wechat-shop/events')
export class WechatShopEventController {
  constructor(
    private readonly wechatShopService: WechatShopService,
    private readonly configService: ConfigService,
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
    const token = this.configService.get<string>('WECHAT_SHOP_WEBHOOK_TOKEN');

    if (!token) {
      throw new UnauthorizedException('WeChat webhook token is not configured');
    }

    // 1. 将 token、timestamp、nonce 三个参数进行字典序排序
    const arr = [token, timestamp, nonce].sort();

    // 2. 将三个参数字符串拼接成一个字符串进行 sha1 加密
    const str = arr.join('');
    const hash = createHash('sha1').update(str).digest('hex');

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
  receiveEvent() {
    // TODO:
    // 1. 验证签名，确保事件来自微信
    // 2. 提取并解密 payload 中的 Encrypt/encrypt 字段
    // 3. 根据解密后的 Event 字段进行路由分发处理 (例如分发给不同的 Service 处理)

    // 微信要求成功接收后返回 'success'
    return 'success';
  }
}
