/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-10-01 01:08:34
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-12-23 00:55:49
 * @FilePath: /lulab_backend/src/hook-tencent-mtg/controllers/tencent-webhook.controller.ts
 * @Description: 腾讯会议Webhook控制器
 *
 * Copyright (c) 2025 by ${git_name_email}, All Rights Reserved.
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTencentUrlVerificationDocs,
  ApiTencentEventReceiverDocs,
} from '../decorators/tencent-webhook.decorators';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@/auth/decorators/public.decorator';
import { TencentEventHandlerService } from '../services/event-handler.service';
import { WebhookLoggingInterceptor } from '../interceptors/webhook-logging.interceptor';
import { TencentMeetingEvent } from '../types';
import {
  TencentUrlVerificationPipe,
  TencentWebhookDecryptionPipe,
} from '../pipes';

/**
 * Tencent Meeting Webhook Controller
 * Specifically handles Tencent Meeting webhook requests
 */
@ApiTags('Webhooks')
@Controller('webhooks/tencent')
@Public()
@UseInterceptors(WebhookLoggingInterceptor)
export class TencentWebhookController {
  private readonly logger = new Logger(TencentWebhookController.name);

  constructor(
    private readonly tencentEventHandlerService: TencentEventHandlerService,
  ) {}

  /**
   * Tencent Meeting Webhook URL verification endpoint (GET)
   * Used for Tencent Meeting webhook URL validity verification
   *
   * 腾讯会议通过GET请求验证URL有效性，参数通过Header传递：
   * - timestamp: 时间戳
   * - nonce: 随机数
   * - signature: 签名
   * - check_str: URL参数中的验证字符串
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiTencentUrlVerificationDocs()
  async verifyTencentWebhook(
    @Query('check_str', TencentUrlVerificationPipe) decryptedStr: string,
  ): Promise<string> {
    this.logger.log(
      'Received Tencent Meeting Webhook URL verification request',
    );
    await Promise.resolve();
    return decryptedStr;
  }

  /**
   * Tencent Meeting Webhook event receiving endpoint (POST)
   * Supports event reception
   *
   * 根据腾讯会议文档要求：
   * - 支持HTTP POST请求接收事件消息回调
   * - 需要对signature进行校验
   * - 需要对data先进行base64解码，再用加密密钥解密
   * - 正确响应：HTTP 200，内容为"successfully received callback"（不能加引号、换行符）
   * - 腾讯会议在5秒内接收不到响应会重试三次（1分钟、3分钟、6分钟后）
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiTencentEventReceiverDocs()
  async handleTencentWebhook(
    @Body(
      new ValidationPipe({ transform: true, whitelist: true }),
      TencentWebhookDecryptionPipe,
    )
    eventData: TencentMeetingEvent,
  ): Promise<string> {
    // 异步处理业务逻辑，不阻塞主流程
    this.tencentEventHandlerService
      .handleEvent(eventData)
      .catch((error: unknown) => {
        this.logger.error(
          'Failed to handle event asynchronously',
          error instanceof Error ? error.stack : undefined,
        );
      });

    await Promise.resolve();
    return 'successfully received callback';
  }
}
