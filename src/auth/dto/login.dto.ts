import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { AuthType } from '@/auth/enums';
import { ClientType } from '@/auth/types/jwt.types';

export class LoginDto {
  @ApiProperty({ description: '登录类型', enum: AuthType })
  @IsEnum(AuthType)
  type: AuthType;

  @ApiProperty({ required: false, description: '用户名' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ required: false, description: '邮箱' })
  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
  email?: string;

  @ApiProperty({ required: false, description: '国家代码，如 +86' })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiProperty({ required: false, description: '手机号' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false, description: '密码' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({ required: false, description: '验证码' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({
    required: false,
    description: '设备信息，如设备型号、操作系统等',
  })
  @IsOptional()
  @IsString()
  deviceInfo?: string;

  @ApiProperty({ required: false, description: '设备ID，用于标识唯一设备' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({
    required: false,
    description: '客户端类型：web-网页端，app-移动端',
    enum: ClientType,
  })
  @IsOptional()
  @IsEnum(ClientType)
  clientType?: ClientType;
}
