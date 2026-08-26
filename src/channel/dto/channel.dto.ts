import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChannelDto {
  @ApiProperty({ description: '渠道 ID' })
  id: number;

  @ApiProperty({ description: '渠道名称' })
  name: string;

  @ApiProperty({ description: '渠道编码' })
  code: string;

  @ApiPropertyOptional({ description: '渠道描述', nullable: true })
  description: string | null;

  @ApiProperty({ description: '是否启用' })
  isActive: boolean;

  @ApiProperty({ description: '关联订单数量' })
  orderCount: number;

  @ApiProperty({ description: '创建时间' })
  createdAt: string;

  @ApiProperty({ description: '更新时间' })
  updatedAt: string;
}

export class ChannelListResponseDto {
  @ApiProperty({ type: [ChannelDto] })
  items: ChannelDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  pageSize: number;

  @ApiProperty()
  totalPages: number;
}
