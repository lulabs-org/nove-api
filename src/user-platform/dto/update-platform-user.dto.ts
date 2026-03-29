import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import type { Platform } from '@prisma/client';

export class UpdatePlatformUserDto {
  @ApiPropertyOptional({
    description: '平台用户ID',
    example: 'user_123456',
  })
  @IsString()
  @IsOptional()
  ptUserId?: string;

  @ApiPropertyOptional({
    description: '显示名称',
    example: '张三',
  })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiPropertyOptional({
    description: '国家代码',
    example: '+86',
  })
  @IsString()
  @IsOptional()
  countryCode?: string;

  @ApiPropertyOptional({
    description: '手机号',
    example: '13800138000',
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    description: '手机号哈希',
    example: 'hashed_phone_value',
  })
  @IsString()
  @IsOptional()
  phoneHash?: string;

  @ApiPropertyOptional({
    description: '本地用户ID',
    example: 'local_user_id',
  })
  @IsString()
  @IsOptional()
  localUserId?: string;

  @ApiPropertyOptional({
    description: '是否激活',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
