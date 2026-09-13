import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateDriveConfigDto {
  @ApiPropertyOptional({ default: 600 })
  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(3600)
  downloadUrlExpiresSeconds?: number;

  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  recycleRetentionDays?: number;

  @ApiPropertyOptional({
    type: [String],
    description: '启用的扩展名白名单；危险格式始终不可启用',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  allowedExtensions?: string[];

  @ApiPropertyOptional({ default: 20, maximum: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  imageMaxMiB?: number;

  @ApiPropertyOptional({ default: 100, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  documentMaxMiB?: number;

  @ApiPropertyOptional({ default: 2048, maximum: 2048 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2048)
  audioMaxMiB?: number;

  @ApiPropertyOptional({ default: 20480, maximum: 20480 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20480)
  videoMaxMiB?: number;
}
