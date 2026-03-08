/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-11-23 23:34:15
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-12-09 18:11:05
 * @FilePath: /lulab_backend/src/hook-tencent-mtg/pipes/tencent-webhook-url-verification.pipe.ts
 * @Description: 腾讯会议WebhookURL验证管道
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import { Injectable, Scope, Inject, PipeTransform } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { Request } from 'express';
import type { ConfigType } from '@nestjs/config';
import { tencentMeetingConfig } from '@/configs/tencent-mtg.config';
import { verifyWebhookUrl } from '@/integrations/tencent-meeting';

@Injectable({ scope: Scope.REQUEST })
export class TencentUrlVerificationPipe
  implements PipeTransform<string, Promise<string>>
{
  constructor(
    @Inject(tencentMeetingConfig.KEY)
    private readonly tencentConfig: ConfigType<typeof tencentMeetingConfig>,
    @Inject(REQUEST)
    private readonly req: Request,
  ) {}

  async transform(value: string): Promise<string> {
    const timestamp = this.req.headers['timestamp'] as string;
    const nonce = this.req.headers['nonce'] as string;
    const signature = this.req.headers['signature'] as string;
    const { token, encodingAesKey } = this.tencentConfig.webhook;

    return await verifyWebhookUrl(
      value,
      timestamp,
      nonce,
      signature,
      token,
      encodingAesKey,
    );
  }
}
