import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserProfileDto {
  @ApiPropertyOptional({ description: '姓名' })
  name?: string;

  @ApiPropertyOptional({ description: '头像URL' })
  avatar?: string;

  @ApiPropertyOptional({ description: '个人简介' })
  bio?: string;

  @ApiPropertyOptional({ description: '名' })
  firstName?: string;

  @ApiPropertyOptional({ description: '姓' })
  lastName?: string;

  @ApiPropertyOptional({ description: '出生日期', format: 'date-time' })
  dateOfBirth?: Date;

  @ApiPropertyOptional({ description: '性别' })
  gender?: string;

  @ApiPropertyOptional({ description: '城市' })
  city?: string;

  @ApiPropertyOptional({ description: '国家' })
  country?: string;
}

export class UserProfileResponseDto {
  @ApiProperty({ description: '用户ID' })
  id: string;

  @ApiProperty({ required: false, nullable: true })
  username?: string;

  @ApiProperty({ description: '邮箱' })
  email: string;

  @ApiProperty({ required: false, nullable: true })
  countryCode?: string;

  @ApiProperty({ required: false, nullable: true })
  phone?: string;

  @ApiProperty({ description: '邮箱是否已验证' })
  emailVerified: boolean;

  @ApiProperty({ description: '手机号是否已验证' })
  phoneVerified: boolean;

  @ApiProperty({
    required: false,
    nullable: true,
    type: String,
    format: 'date-time',
  })
  lastLoginAt?: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ required: false, nullable: true, type: UserProfileDto })
  profile?: UserProfileDto;
}
