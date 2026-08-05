import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Logger,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '@/auth/decorators/public.decorator';
import { wecomConfig, WecomConfig } from '@/configs/wecom.config';
import { WecomEventBodyDto, WecomEventQueryDto } from '../dto/wecom-event.dto';
import { WecomEventService } from '../service/wecom-event.service';
import {
  decryptWecomMessage,
  generateSignature,
} from '../utils/wecom-crypto.util';

@ApiTags('WeCom')
@Controller('webhooks/wecom/events')
export class WecomEventController {
  private readonly logger = new Logger(WecomEventController.name);

  constructor(
    private readonly wecomEventService: WecomEventService,
    @Inject(wecomConfig.KEY) private readonly config: WecomConfig,
  ) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Verify WeCom Webhook URL',
    description: '用于接收并响应企业微信事件推送服务器的 URL 验证请求。',
  })
  verifyWebhook(@Query() query: WecomEventQueryDto) {
    const { webhookToken: token, encodingAesKey, corpId } = this.config;

    if (!token || !encodingAesKey || !corpId) {
      throw new UnauthorizedException('WeCom webhook configuration is missing');
    }

    if (!query.echostr) {
      throw new UnauthorizedException('Missing echostr');
    }

    // 1. 验证签名
    const hash = generateSignature(
      token,
      query.timestamp,
      query.nonce,
      query.echostr,
    );

    if (hash !== query.msg_signature) {
      throw new UnauthorizedException('Invalid msg_signature');
    }

    // 2. 解密 echostr
    try {
      const decryptedEchoStr = decryptWecomMessage(
        query.echostr,
        encodingAesKey,
        corpId,
      );
      // 3. 原样返回明文 echostr
      return decryptedEchoStr;
    } catch (error) {
      throw new UnauthorizedException(
        'Failed to decrypt echostr: ' + (error as Error).message,
      );
    }
  }

  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive WeCom Events',
    description:
      '接收企业微信的各类事件推送（如通讯录变更等），并进行统一验证、解密和分发。',
  })
  receiveEvent(
    @Query() query: WecomEventQueryDto,
    @Body() payload: WecomEventBodyDto,
  ) {
    const { webhookToken: token, encodingAesKey, corpId } = this.config;

    if (!token || !encodingAesKey || !corpId) {
      throw new UnauthorizedException('WeCom webhook configuration is missing');
    }

    const encrypt = payload.Encrypt;
    if (!encrypt) {
      throw new UnauthorizedException('Missing Encrypt field');
    }

    // 1. 验证签名，确保事件来自企业微信
    const hash = generateSignature(
      token,
      query.timestamp,
      query.nonce,
      encrypt,
    );

    if (hash !== query.msg_signature) {
      throw new UnauthorizedException('Invalid msg_signature');
    }

    // 2. 解密 payload 中的 Encrypt 字段
    let decryptedMsg: string;
    try {
      decryptedMsg = decryptWecomMessage(encrypt, encodingAesKey, corpId);
    } catch (error) {
      throw new UnauthorizedException(
        'Failed to decrypt message: ' + (error as Error).message,
      );
    }

    // 3. 将解密后的事件传递给 Service 统一处理，无需 await 以便快速返回 success
    this.wecomEventService.handleWecomEvent(decryptedMsg).catch((err) => {
      this.logger.error('Failed to handle wecom event in background', err);
    });

    // 4. 微信要求成功接收后返回 'success' 或者空字符串
    return 'success';
  }
}
