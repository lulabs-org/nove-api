import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PermissionType } from '@prisma/client';

export class PermissionTreeDto {
  @ApiProperty({ description: '权限ID' })
  id: string;

  @ApiProperty({ description: '权限名称' })
  name: string;

  @ApiProperty({ description: '权限编码' })
  code: string;

  @ApiPropertyOptional({ description: '权限描述', nullable: true })
  description: string | null;

  @ApiProperty({ description: '资源标识' })
  resource: string;

  @ApiProperty({ description: '操作类型' })
  action: string;

  @ApiProperty({ description: '权限类型', enum: PermissionType })
  type: PermissionType;

  @ApiPropertyOptional({ description: '父权限ID', nullable: true })
  parentId: string | null;

  @ApiProperty({ description: '权限层级' })
  level: number;

  @ApiProperty({ description: '排序' })
  sortOrder: number;

  @ApiProperty({ description: '是否启用' })
  active: boolean;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;

  @ApiProperty({
    description: '子权限列表',
    type: [PermissionTreeDto],
    required: false,
  })
  children?: PermissionTreeDto[];
}

export class PermissionListResponse {
  @ApiProperty({ description: '权限列表', type: [PermissionTreeDto] })
  items: PermissionTreeDto[];

  @ApiProperty({ description: '总数' })
  total: number;

  @ApiProperty({ description: '当前页码' })
  page: number;

  @ApiProperty({ description: '每页数量' })
  pageSize: number;

  @ApiProperty({ description: '总页数' })
  totalPages: number;
}
