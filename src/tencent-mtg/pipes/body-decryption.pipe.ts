/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-11-23 23:53:29
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-31 01:29:12
 * @FilePath: /nove_api/src/tencent-mtg/pipes/body-decryption.pipe.ts
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
import { TencentWebhookEventBodyDto } from '../dto/tencent-webhook-body.dto';
import { MeetingEvent } from '../types';
import {
  SingleOrgContextService,
  SystemConfigService,
} from '@/admin/system-config/services';

@Injectable({ scope: Scope.REQUEST }) // 需要获取 Request Headers，所以必须是 Request Scope
export class BodyDecryptionPipe implements PipeTransform {
  constructor(
    @Inject(REQUEST) private readonly request: Request,
    private readonly systemConfigService: SystemConfigService,
    private readonly orgContext: SingleOrgContextService,
  ) {}

  async transform(value: TencentWebhookEventBodyDto): Promise<MeetingEvent> {
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
    const { value: config } = await this.systemConfigService.getEffectiveConfig(
      this.orgContext.getOrgId(),
      'tencent-meeting',
    );
    const token = String(config.webhookToken ?? '');
    const encodingAesKey = String(config.encodingAesKey ?? '');
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
      const parsedData = JSON.parse(decryptedData) as MeetingEvent;
      this.request['decryptedData'] = parsedData;
      return parsedData;
    } catch (error) {
      throw new WebhookDecryptionException(
        'TENCENT_MEETING',
        `Decryption or Parsing failed: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}
