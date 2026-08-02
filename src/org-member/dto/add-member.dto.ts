import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { MemberType } from '@prisma/client';

export class AddMemberDto {
  @ApiProperty({
    description: '姓名（作为 profile.displayName）',
    example: '张三',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty({ message: '姓名不能为空' })
  @MinLength(1, { message: '姓名至少 1 个字符' })
  @MaxLength(50, { message: '姓名最多 50 个字符' })
  name: string;

  @ApiProperty({
    description: '手机号（纯数字，不含国家代码）',
    example: '13800138000',
  })
  @IsString()
  @IsNotEmpty({ message: '手机号不能为空' })
  @Matches(/^\d{7,15}$/, {
    message: '手机号必须为 7-15 位纯数字',
  })
  phone: string;

  @ApiPropertyOptional({
    description: '国家代码，默认 +86',
    example: '+86',
    default: '+86',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+\d{1,4}$/, {
    message: '国家代码格式不正确，例如 +86',
  })
  countryCode?: string;

  @ApiProperty({
    description: '工作邮箱（必填，作为登录邮箱和邀请邮件发送地址）',
    example: 'zhangsan@example.com',
  })
  @IsEmail({}, { message: '邮箱格式不正确' })
  @IsNotEmpty({ message: '邮箱不能为空' })
  email: string;

  @ApiProperty({
    description: '部门 ID 列表（至少 1 个）',
    example: ['clx1111111111111111'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1, { message: '至少选择一个部门' })
  departmentIds: string[];

  @ApiProperty({
    description: '主部门 ID（必须在 departmentIds 中）',
    example: 'clx1111111111111111',
  })
  @IsString()
  @IsNotEmpty({ message: '主部门不能为空' })
  primaryDeptId: string;

  @ApiPropertyOptional({
    description: '成员类型',
    enum: MemberType,
    example: MemberType.INTERNAL,
    default: MemberType.INTERNAL,
  })
  @IsOptional()
  @IsEnum(MemberType)
  type?: MemberType;

  @ApiPropertyOptional({
    description: '职位/头衔',
    example: '软件工程师',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: '职位最多 100 个字符' })
  title?: string;

  @ApiPropertyOptional({
    description: '角色 ID 列表',
    example: ['clx3333333333333333'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleIds?: string[];
}
