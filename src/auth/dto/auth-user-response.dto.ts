/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-08 12:39:17
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-08 23:50:37
 * @FilePath: /lulab_backend/src/auth/dto/auth-user-response.dto.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { ApiProperty } from '@nestjs/swagger';

export class AuthUserResponseDto {
  @ApiProperty({ description: '用户ID' })
  id: string;

  @ApiProperty({ description: '用户名称' })
  name: string;
}
