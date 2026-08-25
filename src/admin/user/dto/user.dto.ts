import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsISO8601,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Gender } from '@prisma/client';

const trimToNull = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

const trimLowercaseToNull = ({ value }: { value: unknown }) => {
  const trimmed = trimToNull({ value });
  return typeof trimmed === 'string' ? trimmed.toLowerCase() : trimmed;
};

const trimToUndefined = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

const queryNumber =
  (defaultValue: number) =>
  ({ value }: { value: unknown }) => {
    const normalized = trimToUndefined({ value });
    return normalized === undefined ? defaultValue : Number(normalized);
  };

const queryBoolean = ({ value }: { value: unknown }) => {
  const normalized = trimToUndefined({ value });
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return normalized;
};

const defaultQueryValue =
  <T>(defaultValue: T) =>
  ({ value }: { value: unknown }) =>
    trimToUndefined({ value }) ?? defaultValue;

export class QueryUsersDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Transform(queryNumber(1))
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Transform(queryNumber(20))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @ApiPropertyOptional({ description: '搜索用户名、邮箱、手机号或显示名称' })
  @IsOptional()
  @Transform(trimToUndefined)
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '是否启用' })
  @IsOptional()
  @Transform(queryBoolean)
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({
    description: '排序字段',
    enum: ['createdAt', 'updatedAt', 'lastLoginAt', 'username', 'email'],
  })
  @IsOptional()
  @Transform(defaultQueryValue('createdAt'))
  @IsIn(['createdAt', 'updatedAt', 'lastLoginAt', 'username', 'email'])
  sortBy: 'createdAt' | 'updatedAt' | 'lastLoginAt' | 'username' | 'email' =
    'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @Transform(defaultQueryValue('desc'))
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'desc';
}

export class CreateAdminUserDto {
  @ApiPropertyOptional({
    description: '用户名；用户名、邮箱、手机号至少填写一个',
    type: String,
    nullable: true,
  })
  @IsOptional()
  @Transform(trimToNull)
  @IsString()
  @MaxLength(50)
  @Matches(/^[a-zA-Z0-9_]+$/, { message: '用户名只能包含字母、数字和下划线' })
  username?: string | null;

  @ApiPropertyOptional({
    description: '邮箱；用户名、邮箱、手机号至少填写一个',
    type: String,
    nullable: true,
  })
  @IsOptional()
  @Transform(trimLowercaseToNull)
  @IsEmail()
  @MaxLength(255)
  email?: string | null;

  @ApiPropertyOptional({
    example: '+86',
    description: '手机号国家代码',
    type: String,
    nullable: true,
  })
  @IsOptional()
  @Transform(trimToNull)
  @Matches(/^\+?\d{1,4}$/, { message: '国家代码格式不正确' })
  countryCode?: string | null;

  @ApiPropertyOptional({
    description: '不含国家代码的手机号',
    type: String,
    nullable: true,
  })
  @IsOptional()
  @Transform(trimToNull)
  @Matches(/^[\d\s()-]+$/, { message: '手机号格式不正确' })
  @MaxLength(30)
  phone?: string | null;

  @ApiPropertyOptional({
    description: '显示名称',
    type: String,
    nullable: true,
  })
  @IsOptional()
  @Transform(trimToNull)
  @IsString()
  @MaxLength(100)
  displayName?: string | null;

  @ApiPropertyOptional({
    description: '头像 URL',
    type: String,
    nullable: true,
  })
  @IsOptional()
  @Transform(trimToNull)
  @IsUrl({}, { message: '头像 URL 格式不正确' })
  @MaxLength(500)
  avatar?: string | null;

  @ApiPropertyOptional({
    description: '个人简介',
    type: String,
    nullable: true,
  })
  @IsOptional()
  @Transform(trimToNull)
  @IsString()
  @MaxLength(500)
  bio?: string | null;

  @ApiPropertyOptional({
    description: '用户填写的完整姓名，未经实名认证',
    type: String,
    nullable: true,
  })
  @IsOptional()
  @Transform(trimToNull)
  @IsString()
  @MaxLength(200)
  fullName?: string | null;

  @ApiPropertyOptional({
    description: '出生日期，格式 YYYY-MM-DD',
    type: String,
    format: 'date',
    nullable: true,
  })
  @IsOptional()
  @Transform(trimToNull)
  @IsISO8601({ strict: true }, { message: '出生日期格式不正确' })
  dateOfBirth?: string | null;

  @ApiPropertyOptional({ enum: Gender, nullable: true, description: '性别' })
  @IsOptional()
  @Transform(trimToNull)
  @IsEnum(Gender)
  gender?: Gender | null;

  @ApiPropertyOptional({
    description: '详细地址',
    type: String,
    nullable: true,
  })
  @IsOptional()
  @Transform(trimToNull)
  @IsString()
  @MaxLength(500)
  address?: string | null;

  @ApiPropertyOptional({ description: '城市', type: String, nullable: true })
  @IsOptional()
  @Transform(trimToNull)
  @IsString()
  @MaxLength(100)
  city?: string | null;

  @ApiPropertyOptional({ description: '国家', type: String, nullable: true })
  @IsOptional()
  @Transform(trimToNull)
  @IsString()
  @MaxLength(100)
  country?: string | null;

  @ApiPropertyOptional({
    description: '邮政编码',
    type: String,
    nullable: true,
  })
  @IsOptional()
  @Transform(trimToNull)
  @IsString()
  @MaxLength(20)
  zipCode?: string | null;

  @ApiPropertyOptional({
    description: '个人网站 URL',
    type: String,
    nullable: true,
  })
  @IsOptional()
  @Transform(trimToNull)
  @IsUrl({}, { message: '个人网站 URL 格式不正确' })
  @MaxLength(255)
  website?: string | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @Transform(trimToUndefined)
  @IsBoolean()
  active?: boolean;
}

export class UpdateAdminUserDto extends CreateAdminUserDto {}

export class AdminUserProfileDto {
  @ApiPropertyOptional({ nullable: true, type: String })
  displayName: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  avatar: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  bio: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  fullName: string | null;

  @ApiPropertyOptional({ nullable: true, type: String, format: 'date' })
  dateOfBirth: Date | null;

  @ApiPropertyOptional({ nullable: true, enum: Gender })
  gender: Gender | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  address: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  city: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  country: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  zipCode: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  website: string | null;
}

export class AdminUserDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  username: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  email: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  countryCode: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  phone: string | null;

  @ApiProperty()
  active: boolean;

  @ApiProperty()
  emailVerified: boolean;

  @ApiProperty()
  phoneVerified: boolean;

  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' })
  lastLoginAt: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;

  @ApiPropertyOptional({ nullable: true, type: AdminUserProfileDto })
  profile: AdminUserProfileDto | null;
}

export class AdminUserListItemDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  username: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  email: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  countryCode: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  phone: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  displayName: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  avatar: string | null;

  @ApiProperty()
  active: boolean;

  @ApiProperty()
  emailVerified: boolean;

  @ApiProperty()
  phoneVerified: boolean;

  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' })
  lastLoginAt: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;
}

export class AdminUserListResponseDto {
  @ApiProperty({ type: [AdminUserListItemDto] })
  items: AdminUserListItemDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  pageSize: number;

  @ApiProperty()
  totalPages: number;
}

export class UserImportFailureDto {
  @ApiProperty({ description: '数据行号，表头为第 1 行' })
  row: number;

  @ApiPropertyOptional({ nullable: true })
  identifier: string | null;

  @ApiProperty()
  code: string;

  @ApiProperty()
  reason: string;
}

export class UserImportResponseDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  successCount: number;

  @ApiProperty()
  failureCount: number;

  @ApiProperty({ type: [UserImportFailureDto] })
  failures: UserImportFailureDto[];
}
