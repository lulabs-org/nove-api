/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-09-23 06:15:34
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-15 12:06:59
 * @FilePath: /nove-api/src/auth/controllers/otp.controller.ts
 * @Description: 认证验证码控制器
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
import { OtpService } from '@/auth/services/otp.service';
import { SendCodeDto } from '@/auth/dto/send-code.dto';
import { VerifyCodeDto } from '@/auth/dto/verify-code.dto';
import { Public } from '@/auth/decorators/public.decorator';
import { ApiSendCodeDocs } from '@/auth/decorators/api-docs/send-code.docs.decorator';
import { ApiVerifyCodeDocs } from '@/auth/decorators/api-docs/verify-code.docs.decorator';
import { Request } from 'express';
import { Req } from '@nestjs/common';
import { HttpUtil } from '@/common/utils/http.util';

@ApiTags('Auth')
@Controller({ path: 'api/auth/otp', version: '1' })
export class OtpController {
  constructor(private readonly otpService: OtpService) {}

  @Public()
  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiSendCodeDocs()
  async send(@Body(ValidationPipe) dto: SendCodeDto, @Req() req: Request) {
    const ip = HttpUtil.getClientIp(req);
    const userAgent = req.get('User-Agent');
    return this.otpService.sendCode(
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
    return this.otpService.verifyCode(dto.target, dto.code, dto.type);
  }
}
