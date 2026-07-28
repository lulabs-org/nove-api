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
import { createHash, createDecipheriv } from 'node:crypto';
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
  receiveEvent(
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
    const arr = [encrypt, query.timestamp, query.nonce, token].sort();
    const str = arr.join('');
    const hash = createHash('sha1').update(str).digest('hex');

    if (hash !== query.msg_signature) {
      throw new UnauthorizedException('Invalid msg_signature');
    }

    // 2. 解密 payload 中的 Encrypt 字段
    try {
      this.decryptWechatMessage(encrypt, encodingAesKey, appId);
    } catch (error) {
      throw new UnauthorizedException(
        'Failed to decrypt message: ' + (error as Error).message,
      );
    }

    // 3. 根据解密后的 Event 字段进行路由分发处理
    // TODO: 例如分发给不同的 Service 处理

    // 微信要求成功接收后返回 'success'
    return 'success';
  }

  private decryptWechatMessage(
    encrypt: string,
    encodingAesKey: string,
    appId: string,
  ): Record<string, unknown> {
    // 1. AESKey = Base64_Decode( EncodingAESKey + "=" )
    const aesKey = Buffer.from(encodingAesKey + '=', 'base64');

    if (aesKey.length !== 32) {
      throw new Error('Invalid EncodingAESKey length');
    }

    // AES CBC 的 iv 取 AESKey 的前 16 字节
    const iv = aesKey.subarray(0, 16);

    const encryptedBuf = Buffer.from(encrypt, 'base64');

    const decipher = createDecipheriv('aes-256-cbc', aesKey, iv);

    // 微信的 PKCS#7 是按照 32 字节块进行填充的，而标准的 AES 块是 16 字节
    // 因此需要关闭自动去填充，手动处理
    decipher.setAutoPadding(false);

    let decryptedBuf = decipher.update(encryptedBuf);
    decryptedBuf = Buffer.concat([decryptedBuf, decipher.final()]);

    // 手动去除 PKCS#7 填充
    const pad = decryptedBuf[decryptedBuf.length - 1];
    let unpaddedBuf = decryptedBuf;
    if (pad >= 1 && pad <= 32) {
      unpaddedBuf = decryptedBuf.subarray(0, decryptedBuf.length - pad);
    }

    // FullStr = random(16B) + msg_len(4B) + msg + appid
    if (unpaddedBuf.length < 20) {
      throw new Error('Decrypted buffer too short');
    }

    const msgLen = unpaddedBuf.readUInt32BE(16);
    const msgBuf = unpaddedBuf.subarray(20, 20 + msgLen);
    const msgAppIdBuf = unpaddedBuf.subarray(20 + msgLen);

    const msg = msgBuf.toString('utf8');
    const msgAppId = msgAppIdBuf.toString('utf8');

    if (msgAppId !== appId) {
      throw new Error('AppID mismatch');
    }

    return JSON.parse(msg) as Record<string, unknown>;
  }
}
