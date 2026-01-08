/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-07 15:31:00
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-07 15:31:01
 * @FilePath: /lulab_backend/src/auth/dto/logout-response.dto.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { ApiProperty } from '@nestjs/swagger';

export class LogoutDetailsDto {
  @ApiProperty({ description: '访问令牌是否被撤销' })
  accessTokenRevoked: boolean;

  @ApiProperty({ description: '刷新令牌是否被撤销' })
  refreshTokenRevoked: boolean;

  @ApiProperty({ description: '是否撤销了所有设备的令牌', required: false })
  allDevicesLoggedOut?: boolean;

  @ApiProperty({ description: '撤销的令牌数量', required: false })
  revokedTokensCount?: number;
}

export class LogoutResponseDto {
  @ApiProperty({ description: '退出是否成功' })
  success: boolean;

  @ApiProperty({ description: '退出结果消息' })
  message: string;

  @ApiProperty({
    description: '详细信息',
    required: false,
    type: LogoutDetailsDto,
  })
  details?: LogoutDetailsDto;
}
