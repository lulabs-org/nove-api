/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-11-23 23:53:29
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-12-18 20:12:04
 * @FilePath: /lulab_backend/src/hook-tencent-mtg/pipes/tencent-webhook-body-decryption.pipe.ts
 * @Description: 腾讯会议Webhook解密管道
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import {
  PipeTransform,
  Injectable,
  Inject,
  BadRequestException,
  Scope,
} from '@nestjs/common';
import {
  verifySignature,
  aesDecrypt,
  WebhookSignatureVerificationException,
  WebhookDecryptionException,
} from '@/integrations/tencent-meeting';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express'; // 或 fastify
import { ConfigType } from '@nestjs/config';
import { tencentMeetingConfig } from '@/configs/tencent-mtg.config';
import { TencentWebhookEventBodyDto } from '../dto/tencent-webhook-body.dto';
import { TencentMeetingEvent } from '../types';

@Injectable({ scope: Scope.REQUEST }) // 需要获取 Request Headers，所以必须是 Request Scope
export class TencentWebhookDecryptionPipe implements PipeTransform {
  constructor(
    @Inject(REQUEST) private readonly request: Request,
    @Inject(tencentMeetingConfig.KEY)
    private readonly tencentConfig: ConfigType<typeof tencentMeetingConfig>,
  ) {}

  async transform(
    value: TencentWebhookEventBodyDto,
  ): Promise<TencentMeetingEvent> {
    // 1. 基础参数校验
    if (!value || !value.data) {
      throw new BadRequestException(
        'Invalid Webhook request - missing data field',
      );
    }

    // 2. 从 Headers 获取签名参数
    const timestamp = this.request.headers['timestamp'] as string;
    const nonce = this.request.headers['nonce'] as string;
    const signature = this.request.headers['signature'] as string;

    if (!timestamp || !nonce || !signature) {
      throw new BadRequestException('Missing required signature headers');
    }

    // 3. 验证签名
    const { token, encodingAesKey } = this.tencentConfig.webhook;
    const isValid = verifySignature(
      token,
      timestamp,
      nonce,
      value.data, // encryptedData
      signature,
    );

    if (!isValid) {
      throw new WebhookSignatureVerificationException('TENCENT_MEETING');
    }

    // 4. 解密数据
    try {
      const decryptedData = await aesDecrypt(value.data, encodingAesKey);
      return JSON.parse(decryptedData) as TencentMeetingEvent;
    } catch (error) {
      throw new WebhookDecryptionException(
        'TENCENT_MEETING',
        `Decryption or Parsing failed: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}
