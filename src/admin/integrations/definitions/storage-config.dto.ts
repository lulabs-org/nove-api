import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateStorageConfigDto {
  @ApiPropertyOptional({
    enum: ['OSS', 'COS', 'S3', 'LOCAL'],
    default: 'OSS',
    description: '对象存储服务商',
  })
  @IsOptional()
  @IsIn(['OSS', 'COS', 'S3', 'LOCAL'])
  provider?: 'OSS' | 'COS' | 'S3' | 'LOCAL';

  @ApiPropertyOptional({
    default: 'oss-cn-hangzhou',
    description: '存储桶地域 (Region)，如 oss-cn-hangzhou',
  })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({
    description: '私有存储桶名称 (Bucket)，用于云盘文件与核心附件',
  })
  @IsOptional()
  @IsString()
  bucket?: string;

  @ApiPropertyOptional({
    description:
      '公共媒体存储桶 (Public Bucket，可选)，用于头像等公开访问资源；留空表示复用私有存储桶',
  })
  @IsOptional()
  @IsString()
  publicBucket?: string;

  @ApiPropertyOptional({
    description: 'AccessKey ID',
  })
  @IsOptional()
  @IsString()
  accessKeyId?: string;

  @ApiPropertyOptional({
    description: 'AccessKey Secret',
  })
  @IsOptional()
  @IsString()
  accessKeySecret?: string;

  @ApiPropertyOptional({
    description: '公开访问地址 (Base URL)，例如 CDN 加速域名或 Bucket 外网域名，末尾不带斜杠',
  })
  @IsOptional()
  @IsString()
  publicBaseUrl?: string;

  @ApiPropertyOptional({
    default: 600,
    description: '签名读取 URL 有效期（秒），允许 60～3600 秒',
  })
  @IsOptional()
  @IsInt()
  @Min(60)
  @Max(3600)
  signedUrlExpiresSeconds?: number;
}
