/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-29 19:50:21
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-29 19:50:22
 * @FilePath: /nove_api/src/user-platform/dto/upsert-many-platform-users.dto.ts
 * @Description: 
 * 
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved. 
 */
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UpsertPlatformUserDto } from './upsert-platform-user.dto';

export class UpsertManyPlatformUsersDto {
  @ApiProperty({
    description: '批量更新数据',
    type: [UpsertPlatformUserDto],
    isArray: true,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertPlatformUserDto)
  items: UpsertPlatformUserDto[];
}
