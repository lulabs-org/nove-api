import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateRoleBindingDto {
  @ApiProperty({
    description: '角色 ID',
    example: 'clx1234567890abcdef',
  })
  @IsString()
  @IsNotEmpty()
  roleId: string;

  @ApiProperty({
    description: '成员 ID',
    example: 'clx1234567890abcdef',
  })
  @IsString()
  @IsNotEmpty()
  membershipId: string;

  @ApiProperty({
    description: '部门 ID（可选，null 表示组织级角色，有值表示部门级角色）',
    example: 'clx1234567890abcdef',
    required: false,
  })
  @IsString()
  @IsOptional()
  deptId?: string;
}
