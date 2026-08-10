/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-08-08 20:00:00
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-08-08 20:00:00
 * @FilePath: /nove_api/src/auth/dto/reset-password-response.dto.ts
 * @Description: 重置密码响应 DTO，同时作为 Swagger schema 的唯一真相源
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordResponseDto {
  @ApiProperty({ description: '重置是否成功', example: true })
  success: boolean;

  @ApiProperty({ description: '重置结果消息', example: '密码重置成功' })
  message: string;

  @ApiProperty({
    description: '新的访问令牌（JWT），用于后续请求的 Authorization 头',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: '访问令牌有效期（秒）',
    example: 900,
  })
  expiresIn: number;

  @ApiProperty({
    description:
      '新的刷新令牌（仅 app 客户端在 body 中返回；web 客户端通过 httpOnly cookie 下发，body 不返回）',
    required: false,
  })
  refreshToken?: string;

  @ApiProperty({
    description: '刷新令牌有效期（秒，仅 app 客户端返回）',
    required: false,
    example: 2592000,
  })
  refreshExpiresIn?: number;
}
