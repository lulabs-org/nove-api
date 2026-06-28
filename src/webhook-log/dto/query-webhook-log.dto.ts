import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { WebhookStatus } from '@prisma/client';

export class QueryWebhookLogDto {
  @ApiPropertyOptional({ description: '当前页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页条数', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 20;

  @ApiPropertyOptional({ description: '第三方提供商标识 (如 LARK, TENCENT_MEETING)' })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({ description: '事件名称 (如 meeting.recording.ready)' })
  @IsOptional()
  @IsString()
  event?: string;

  @ApiPropertyOptional({ description: 'Webhook处理状态', enum: WebhookStatus })
  @IsOptional()
  @IsEnum(WebhookStatus)
  status?: WebhookStatus;
}
