/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-20 20:14:03
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-20 20:17:23
 * @FilePath: /nove_api/src/role/dto/set-role-permissions.dto.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsNotEmpty } from 'class-validator';

export class SetRolePermissionsDto {
  @ApiProperty({
    description: '权限编码列表',
    example: ['user:read', 'user:write', 'org:manage'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  permissionKeys: string[];
}
