import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ExtendOrderDto {
  @ApiProperty({
    description: '延期天数（正整数，必须大于等于 1）',
    example: 36,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3650) // 最多延期10年
  days: number;

  @ApiPropertyOptional({
    description: '延期原因或业务备注（如活动赠送、客服服务补偿等）',
    example: '系统升级维护补偿延期36天',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
