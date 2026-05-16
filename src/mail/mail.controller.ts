/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-10-02 21:14:03
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-10-03 04:51:36
 * @FilePath: /lulab_backend/src/mail/mail.controller.ts
 * @Description:
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import {
  Controller,
  Post,
  Body,
  Get,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ApiBearerAuth } from '@nestjs/swagger';
import { MailService } from './mail.service';
import { SendEmailDto } from './dto/send-email.dto';
import { Public } from '@/auth/decorators/public.decorator';
import { User, CurrentUser } from '@/auth/decorators/user.decorator';
import {
  ApiSendEmailDocs,
  ApiVerifyConnectionDocs,
} from './decorators/mail.decorators';

@ApiTags('Mail')
@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post('send')
  @ApiSendEmailDocs()
  async sendEmail(@Body() sendEmailDto: SendEmailDto) {
    try {
      const result = await this.mailService.sendEmail(sendEmailDto);

      if (result.success) {
        return {
          statusCode: HttpStatus.OK,
          message: '邮件发送成功',
          data: {
            messageId: result.messageId,
          },
        };
      } else {
        throw new HttpException(
          {
            statusCode: HttpStatus.BAD_REQUEST,
            message: '邮件发送失败',
            error: result.error,
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: '服务器内部错误',
          error: (error as Error).message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('verify')
  @Public()
  @ApiVerifyConnectionDocs()
  async verifyConnection() {
    try {
      const isConnected = await this.mailService.verifyConnection();

      return {
        statusCode: HttpStatus.OK,
        message: isConnected ? 'SMTP连接正常' : 'SMTP连接失败',
        data: {
          connected: isConnected,
        },
      };
    } catch (error) {
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: '验证连接时发生错误',
          error: (error as Error).message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('send-later')
  @ApiBearerAuth()
  async sendLater(
    @User() user: CurrentUser,
    @Body('email') email: string,
    @Body('delay') delay: number, // 毫秒
  ) {
    return this.mailService.sendMailLater(email, delay);
  }
}
