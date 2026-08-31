import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CodeType } from '@/common/enums';

export class SendCodeDto {
  @ApiProperty({ description: '目标邮箱或手机号' })
  @IsString()
  target: string;

  @ApiProperty({ description: '验证码类型', enum: CodeType })
  @IsEnum(CodeType)
  type: CodeType;

  @ApiProperty({
    required: false,
    description: '国家代码，如 +86（手机号时可选）',
  })
  @IsOptional()
  @IsString()
  countryCode?: string;
}
