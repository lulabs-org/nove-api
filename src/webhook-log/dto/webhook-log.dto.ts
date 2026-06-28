import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WebhookStatus } from '@prisma/client';

export class WebhookLogDto {
  @ApiProperty({ description: 'ID' })
  id: string;

  @ApiProperty({ description: '平台/提供商标识' })
  provider: string;

  @ApiProperty({ description: '事件名称' })
  event: string;

  @ApiProperty({ description: '原始 Payload', type: Object })
  payload: any;

  @ApiPropertyOptional({ description: '解析后的业务数据', type: Object })
  data?: any;

  @ApiPropertyOptional({ description: '请求头数据', type: Object })
  headers?: any;

  @ApiProperty({ description: '处理状态', enum: WebhookStatus })
  status: WebhookStatus;

  @ApiPropertyOptional({ description: '错误信息' })
  errorMessage?: string;

  @ApiPropertyOptional({ description: '外部关联ID' })
  externalId?: string;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
}

export class WebhookLogListResponseDto {
  @ApiProperty({ type: [WebhookLogDto] })
  data: WebhookLogDto[];

  @ApiProperty({ description: '总条数' })
  total: number;
}
