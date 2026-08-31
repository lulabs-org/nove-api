import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength, Matches } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({ required: false, description: '用户名' })
  @IsOptional()
  @IsString()
  @MinLength(3, { message: '用户名至少3个字符' })
  @Matches(/^[a-zA-Z0-9_]+$/, { message: '用户名只能包含字母、数字和下划线' })
  username?: string;

  @ApiProperty({ required: false, description: '显示名称' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiProperty({ required: false, description: '个人简介' })
  @IsOptional()
  @IsString()
  bio?: string;
}
