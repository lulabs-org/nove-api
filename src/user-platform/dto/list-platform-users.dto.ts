import { ApiPropertyOptional } from '@nestjs/swagger';
import { Platform } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListPlatformUsersDto {
  @ApiPropertyOptional({
    description: '平台类型过滤',
    enum: Platform,
    example: 'TENCENT_MEETING',
  })
  @IsOptional()
  @IsEnum(Platform)
  platform?: Platform;

  @ApiPropertyOptional({
    description: '关键字搜索（匹配 displayName / phone）',
    example: '张三',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({
    description: '是否激活（true=激活, false=停用, 不传=全部）',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  active?: boolean;

  @ApiPropertyOptional({
    description: '本地用户 ID 过滤',
    example: 'cmneuekeo0009ccj8mizpg35x',
  })
  @IsOptional()
  @IsString()
  localUserId?: string;

  @ApiPropertyOptional({ description: '页码（从 1 开始）', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页条数', example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number = 20;
}

export class PlatformUserListResponseDto {
  @ApiPropertyOptional({ description: '记录总数' })
  total: number;

  @ApiPropertyOptional({ description: '当前页码' })
  page: number;

  @ApiPropertyOptional({ description: '每页条数' })
  pageSize: number;

  @ApiPropertyOptional({ description: '总页数' })
  totalPages: number;
}
