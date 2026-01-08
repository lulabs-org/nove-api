import { ApiProperty } from '@nestjs/swagger';

export class AuthUserWithPermissionsDto {
  @ApiProperty({ description: '用户ID' })
  id: string;

  @ApiProperty({ description: '用户名', required: false })
  username?: string;

  @ApiProperty({ description: '邮箱' })
  email: string;

  @ApiProperty({ description: '手机号', required: false })
  phone?: string;

  @ApiProperty({ description: '国家代码', required: false })
  countryCode?: string;

  @ApiProperty({ description: '用户名称' })
  name: string;

  @ApiProperty({ description: '头像', required: false })
  avatar?: string;

  @ApiProperty({ description: '用户角色代码列表', type: [String] })
  roles: string[];

  @ApiProperty({ description: '权限列表', type: [String] })
  permissions: string[];

  @ApiProperty({ description: '账户是否激活' })
  active: boolean;

  @ApiProperty({ description: '邮箱是否验证' })
  emailVerified: boolean;

  @ApiProperty({ description: '手机号是否验证' })
  phoneVerified: boolean;

  @ApiProperty({ description: '创建时间' })
  createdAt: string;

  @ApiProperty({ description: '最后登录时间', required: false })
  lastLoginAt?: string;
}
