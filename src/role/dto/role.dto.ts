import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoleType } from '@prisma/client';

export class RoleDto {
  @ApiProperty({
    description: '角色 ID',
    example: 'clx1234567890abcdef',
  })
  id: string;

  @ApiProperty({
    description: '角色名称',
    example: '管理员',
  })
  name: string;

  @ApiProperty({
    description: '角色编码',
    example: 'admin',
  })
  code: string;

  @ApiPropertyOptional({
    description: '角色描述',
    example: '系统管理员角色',
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description: '角色类型',
    enum: RoleType,
    example: RoleType.CUSTOM,
  })
  type: RoleType;

  @ApiProperty({
    description: '角色级别，数字越小权限越高',
    example: 1,
  })
  level: number;

  @ApiProperty({
    description: '是否启用',
    example: true,
  })
  active: boolean;

  @ApiProperty({
    description: '权限 ID 列表',
    type: [String],
    example: ['permission-id-1', 'permission-id-2'],
  })
  permissionIds: string[];

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
}

export class RoleListResponse {
  @ApiProperty({
    description: '角色列表',
    type: [RoleDto],
  })
  items: RoleDto[];

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
