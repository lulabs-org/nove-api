import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { Platform } from '@prisma/client';

export class FindByUnionIdDto {
  @ApiProperty({
    description: '平台类型',
    enum: Platform,
  })
  @IsEnum(Platform)
  @IsNotEmpty()
  platform: Platform;

  @ApiProperty({
    description: '平台联合ID',
    example: 'union_id_123456',
  })
  @IsString()
  @IsNotEmpty()
  ptUnionId: string;
}
