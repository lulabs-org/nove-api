import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  MinLength,
  Matches,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { ClientType } from '../types/jwt.types';

export class ResetPasswordDto {
  @ApiProperty({ description: '目标邮箱或手机号' })
  @IsString()
  target: string;

  @ApiProperty({ description: '重置密码验证码' })
  @IsString()
  @MinLength(4, { message: '验证码至少4位' })
  code: string;

  @ApiProperty({ description: '新密码，至少6位且包含字母和数字' })
  @IsString()
  @MinLength(6, { message: '密码至少6个字符' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{6,}$/, {
    message: '密码必须包含至少一个字母和一个数字',
  })
  newPassword: string;

  @ApiProperty({
    description:
      '客户端类型，决定 refresh token 下发方式（web=cookie，app=body）',
    enum: ClientType,
    required: false,
  })
  @IsOptional()
  @IsEnum(ClientType)
  clientType?: ClientType;
}
