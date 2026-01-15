/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-09-23 06:15:34
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-15 12:06:59
 * @FilePath: /lulab_backend/src/verification/verification.controller.ts
 * @Description: 验证服务控制器
 *
 * Copyright (c) 2025 by 杨仕明 shiming.y@qq.com, All Rights Reserved.
 */

import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { VerificationService } from './verification.service';
import { SendCodeDto } from './dto/send-code.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { Public } from '@/auth/decorators/public.decorator';
import { ApiSendCodeDocs, ApiVerifyCodeDocs } from '@/verification/decorators';
import { Request } from 'express';
import { Req } from '@nestjs/common';
import { HttpUtil } from '@/common/utils/http.util';

@ApiTags('Auth')
@Controller({ path: 'api/auth/otp', version: '1' })
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Public()
  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiSendCodeDocs()
  async send(@Body(ValidationPipe) dto: SendCodeDto, @Req() req: Request) {
    const ip = HttpUtil.getClientIp(req);
    const userAgent = req.get('User-Agent');
    return this.verificationService.sendCode(
      dto.target,
      dto.type,
      ip,
      userAgent,
      dto.countryCode,
    );
  }

  @Public()
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiVerifyCodeDocs()
  async verify(@Body(ValidationPipe) dto: VerifyCodeDto) {
    return this.verificationService.verifyCode(dto.target, dto.code, dto.type);
  }
}
