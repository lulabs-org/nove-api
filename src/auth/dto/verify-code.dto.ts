import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, MinLength } from 'class-validator';
import { CodeType } from '@/common/enums';

export class VerifyCodeDto {
  @ApiProperty({ description: '目标邮箱或手机号' })
  @IsString()
  target: string;

  @ApiProperty({ description: '验证码，4-6位数字' })
  @IsString()
  @MinLength(4, { message: '验证码至少4位' })
  code: string;

  @ApiProperty({ description: '验证码类型', enum: CodeType })
  @IsEnum(CodeType)
  type: CodeType;
}
