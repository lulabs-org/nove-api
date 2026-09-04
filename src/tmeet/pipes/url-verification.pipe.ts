/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-11-23 23:34:15
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-31 01:28:09
 * @FilePath: /nove_api/src/tencent-mtg/pipes/url-verification.pipe.ts
 * @Description: 腾讯会议WebhookURL验证管道
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import { Injectable, Scope, Inject, PipeTransform } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import { verifyWebhookUrl } from '../utils/crypto.util';
import {
  SingleOrgContextService,
  SystemConfigService,
} from '@/admin/system-config/services';

@Injectable({ scope: Scope.REQUEST })
export class UrlVerificationPipe
  implements PipeTransform<string, Promise<string>>
{
  constructor(
    private readonly systemConfigService: SystemConfigService,
    private readonly orgContext: SingleOrgContextService,
    @Inject(REQUEST)
    private readonly req: Request,
  ) {}

  async transform(value: string): Promise<string> {
    const timestamp = this.req.headers['timestamp'] as string;
    const nonce = this.req.headers['nonce'] as string;
    const signature = this.req.headers['signature'] as string;
    const { value: config } = await this.systemConfigService.getEffectiveConfig(
      this.orgContext.getOrgId(),
      'tencent-meeting',
    );

    return await verifyWebhookUrl(
      value,
      timestamp,
      nonce,
      signature,
      String(config.webhookToken ?? ''),
      String(config.encodingAesKey ?? ''),
    );
  }
}
