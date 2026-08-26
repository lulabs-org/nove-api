import { ApiProperty } from '@nestjs/swagger';

export class DepartmentMemberDto {
  @ApiProperty({
    description: '用户 ID',
    example: 'clx1234567890abcdef',
  })
  userId: string;

  @ApiProperty({
    description: '用户名',
    example: 'john_doe',
  })
  username: string | null;

  @ApiProperty({
    description: '显示名称',
    example: 'John Doe',
  })
  displayName: string | null;

  @ApiProperty({
    description: '头像 URL',
    example: 'https://example.com/avatar.jpg',
  })
  avatar: string | null;

  @ApiProperty({
    description: '邮箱',
    example: 'john@example.com',
  })
  email: string | null;

  @ApiProperty({
    description: '是否为主部门',
    example: true,
  })
  isPrimary: boolean;

  @ApiProperty({
    description: '加入时间',
    example: '2026-01-05T00:00:00.000Z',
  })
  joinedAt: Date;
}

export class DepartmentMembersResponse {
  @ApiProperty({
    description: '部门成员列表',
    type: [DepartmentMemberDto],
  })
  items: DepartmentMemberDto[];

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
