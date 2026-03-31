import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DepartmentDto {
  @ApiProperty({
    description: '部门 ID',
    example: 'clx1234567890abcdef',
  })
  id: string;

  @ApiProperty({
    description: '部门名称',
    example: '技术部',
  })
  name: string;

  @ApiProperty({
    description: '部门编码',
    example: 'TECH',
  })
  code: string;

  @ApiPropertyOptional({
    description: '部门描述',
    example: '负责技术研发工作',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description: '所属组织 ID',
    example: 'clx0987654321fedcba',
  })
  organizationId: string;

  @ApiPropertyOptional({
    description: '父部门 ID',
    example: 'clx0987654321fedcba',
    nullable: true,
  })
  parentId: string | null;

  @ApiProperty({
    description: '部门层级',
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

  @ApiPropertyOptional({
    description: '负责人用户 ID',
    example: 'clx1234567890abcdef',
    nullable: true,
  })
  leaderUserId: string | null;

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

export class DepartmentTreeDto extends DepartmentDto {
  @ApiProperty({
    description: '子部门列表',
    type: [DepartmentTreeDto],
  })
  children: DepartmentTreeDto[];
}

export class DepartmentListResponse {
  @ApiProperty({
    description: '部门列表',
    type: [DepartmentDto],
  })
  items: DepartmentDto[];

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
