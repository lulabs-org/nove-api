import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateFileScanningConfigDto {
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
