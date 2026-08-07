/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-11-22 23:46:35
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-11-23 11:23:03
 * @FilePath: /lulab_backend/src/lark-meeting/controllers/webhook.controller.ts
 * @Description:
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import {
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Logger,
  Req,
  Res,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '@/auth/decorators/public.decorator';
import { EventDispatcher } from '@larksuiteoapi/node-sdk';
import { createLarkAdapter } from '../adapter/lark-event-adapter';
import { MeetingEndedEventData } from '../types/lark-meeting.types';
import { Response, Request } from 'express';
import { LarkMeetingService } from '../services/lark-meeting.service';
import { LarkEvent } from '../enums/lark-event.enum';
import { ConfigType } from '@nestjs/config';
import { larkConfig } from '@/configs/lark.config';

@ApiTags('Webhooks')
@Controller('webhooks/lark')
export class LarkWebhookController {
  private readonly logger = new Logger(LarkWebhookController.name);
  private readonly larkMeetingService: LarkMeetingService;
  private readonly eventDispatcher: EventDispatcher;

  constructor(
    larkMeetingService: LarkMeetingService,
    @Inject(larkConfig.KEY)
    private readonly larkConf: ConfigType<typeof larkConfig>,
  ) {
    this.larkMeetingService = larkMeetingService;
    this.eventDispatcher = new EventDispatcher({
      encryptKey: this.larkConf.event.encryptKey,
      verificationToken: this.larkConf.event.verificationToken,
    }).register({
      [LarkEvent.VC_MEETING_ALL_ENDED_V1]: (data: MeetingEndedEventData) => {
        this.larkMeetingService
          .enqueueMeetingEnded(data)
          .catch((err) => this.logger.error('enqueueMeetingEnded_failed', err));
        return 'success';
      },
      '*': (data: Record<string, unknown>) => {
        this.logger.warn({
          event: 'unhandled_lark_event',
          data,
        });
        return 'success';
      },
    });
  }

  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lark Webhook',
    description: '接收 Lark Webhook 事件',
  })
  @ApiResponse({ status: 200, description: 'Webhook 处理成功' })
  async handleLarkWebhook(
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    this.logger.log('收到 Lark Webhook 请求');

    // 创建适配器处理函数
    const handleLarkEvent = createLarkAdapter(this.eventDispatcher, {
      autoChallenge: true, // 自动处理飞书的URL验证
      needCheck: true, // 是否启用事件安全验证，生产环境建议设为true
    });

    // 处理事件
    await handleLarkEvent(request, response);
  }
}
