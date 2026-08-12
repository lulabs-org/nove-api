import { ApiProperty } from '@nestjs/swagger';

export class RoleBindingDto {
  @ApiProperty({
    description: '绑定 ID',
    example: 'clx1234567890abcdef',
  })
  id: string;

  @ApiProperty({
    description: '角色 ID',
    example: 'clx1234567890abcdef',
  })
  roleId: string;

  @ApiProperty({
    description: '成员 ID',
    example: 'clx1234567890abcdef',
  })
  membershipId: string;

  @ApiProperty({
    description: '部门 ID（null 表示组织级角色，有值表示部门级角色）',
    example: 'clx1234567890abcdef',
    required: false,
  })
  deptId?: string;

  @ApiProperty({
    description: '创建时间',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;
}
