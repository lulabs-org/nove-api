/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-09 01:51:17
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-09 01:51:36
 * @FilePath: /lulab_backend/src/auth/dto/auth-user-minimal.dto.ts
 * @Description: 
 * 
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved. 
 */
import { ApiProperty } from '@nestjs/swagger';

export class AuthUserMinimalDto {
  @ApiProperty({ description: '用户ID' })
  id: string;

  @ApiProperty({ description: '用户名称' })
  name: string;

  @ApiProperty({ description: '用户角色代码列表', type: [String] })
  roles: string[];
}
