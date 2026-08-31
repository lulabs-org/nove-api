import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateDriveConfigDto {
  @ApiProperty({ description: '会议同步默认归属组织 ID' })
  @IsString()
  @IsNotEmpty()
  defaultOrgId: string;

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

  @ApiPropertyOptional({
    enum: ['ALIYUN_SAS', 'CLAMAV'],
    description: '生产建议 ALIYUN_SAS；ClamAV 用于本地或专用扫描节点',
  })
  @IsOptional()
  @IsIn(['ALIYUN_SAS', 'CLAMAV'])
  malwareScanProvider?: 'ALIYUN_SAS' | 'CLAMAV';

  @ApiPropertyOptional({ default: 'cn-beijing' })
  @IsOptional()
  @IsString()
  aliyunSasRegionId?: string;

  @ApiPropertyOptional({ default: 300000 })
  @IsOptional()
  @IsInt()
  @Min(30000)
  @Max(1800000)
  scanTimeoutMs?: number;

  @ApiPropertyOptional({ default: 3000 })
  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(30000)
  scanPollIntervalMs?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clamAvHost?: string;

  @ApiPropertyOptional({ default: 3310 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  clamAvPort?: number;

  @ApiPropertyOptional({ default: 600000 })
  @IsOptional()
  @IsInt()
  @Min(1000)
  @Max(3600000)
  clamAvTimeoutMs?: number;
}
