import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class WechatOrderIncrementalSyncDto {
  @ApiPropertyOptional({
    description: '向前重叠拉取的小时数，默认 2 小时',
    default: 2,
    minimum: 1,
    maximum: 48,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(48)
  lookbackHours?: number;

  @ApiPropertyOptional({
    description: '每页数量，微信小店限制不超过 100',
    default: 100,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @ApiPropertyOptional({
    description: '仅拉取并解析，不写入数据库',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}
