import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrganizationDto {
  @ApiProperty({
    description: '组织 ID',
    example: 'clx1234567890abcdef',
  })
  id: string;

  @ApiProperty({
    description: '组织名称',
    example: 'Acme Corporation',
  })
  name: string;

  @ApiProperty({
    description: '组织编码',
    example: 'ACME',
  })
  code: string;

  @ApiPropertyOptional({
    description: '组织 Logo URL',
    example: 'https://example.com/logo.png',
    nullable: true,
  })
  logo: string | null;

  @ApiPropertyOptional({
    description: '组织描述',
    example: 'A leading technology company',
    nullable: true,
  })
  description: string | null;

  @ApiPropertyOptional({
    description: '父组织 ID',
    example: 'clx0987654321fedcba',
    nullable: true,
  })
  parentId: string | null;

  @ApiProperty({
    description: '组织层级',
    example: 1,
  })
  level: number;

  @ApiProperty({
    description: '排序',
    example: 0,
  })
  sortOrder: number;

  @ApiProperty({
    description: '是否启用',
    example: true,
  })
  active: boolean;

  @ApiProperty({
    description: '创建时间',
    example: '2026-01-05T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: '更新时间',
    example: '2026-01-05T00:00:00.000Z',
  })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: '删除时间',
    example: '2026-01-05T00:00:00.000Z',
    nullable: true,
  })
  deletedAt: Date | null;
}

export class OrganizationListResponse {
  @ApiProperty({
    description: '组织列表',
    type: [OrganizationDto],
  })
  items: OrganizationDto[];

  @ApiProperty({
    description: '总数',
    example: 42,
  })
  total: number;

  @ApiProperty({
    description: '当前页码',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: '每页数量',
    example: 10,
  })
  pageSize: number;

  @ApiProperty({
    description: '总页数',
    example: 5,
  })
  totalPages: number;
}
