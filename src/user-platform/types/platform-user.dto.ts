import { ApiProperty } from '@nestjs/swagger';
import { Platform } from '@prisma/client';

export class PlatformUserDto {
  @ApiProperty({ description: '平台用户ID' })
  id: string;

  @ApiProperty({ description: '平台类型', enum: Platform })
  platform: string;

  @ApiProperty({ description: '平台联合ID' })
  ptUnionId: string;

  @ApiProperty({ description: '平台用户ID', required: false })
  ptUserId?: string;

  @ApiProperty({ description: '显示名称', required: false })
  displayName?: string;

  @ApiProperty({ description: '国家代码', required: false })
  countryCode?: string;

  @ApiProperty({ description: '手机号', required: false })
  phone?: string;

  @ApiProperty({ description: '手机号哈希', required: false })
  phoneHash?: string;

  @ApiProperty({ description: '本地用户ID', required: false })
  localUserId?: string;

  @ApiProperty({ description: '是否激活' })
  active: boolean;

  @ApiProperty({ description: '最后活跃时间' })
  lastSeenAt: Date;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;

  @ApiProperty({ description: '删除时间', required: false })
  deletedAt?: Date;
}
