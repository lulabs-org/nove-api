import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateChannelDto {
  @ApiProperty({ description: '渠道名称', example: '微信小程序' })
  @Transform(trim)
  @IsString()
  @Length(1, 255)
  name: string;

  @ApiProperty({ description: '唯一渠道编码', example: 'WECHAT_MINIPROGRAM' })
  @Transform(trim)
  @IsString()
  @Length(1, 50)
  code: string;

  @ApiPropertyOptional({ description: '渠道描述' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ description: '是否启用', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
