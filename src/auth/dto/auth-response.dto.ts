import { ApiProperty } from '@nestjs/swagger';

export class UserBasicInfoDto {
  @ApiProperty({ description: '用户ID' })
  id: string;

  @ApiProperty({ description: '用户名', required: false, nullable: true })
  username?: string;

  @ApiProperty({ description: '邮箱' })
  email: string;

  @ApiProperty({ description: '手机号', required: false, nullable: true })
  phone?: string;

  @ApiProperty({ description: '国家代码', required: false, nullable: true })
  countryCode?: string;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;
}

export class AuthResponseDto {
  @ApiProperty({ description: '访问令牌' })
  accessToken: string;

  @ApiProperty({ description: '刷新令牌' })
  refreshToken: string;

  @ApiProperty({ description: '用户基本信息', type: UserBasicInfoDto })
  user: UserBasicInfoDto;
}
