import { Transform, Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SecurityVerificationMethod {
  PASSWORD = 'password',
  EMAIL_CODE = 'email_code',
  PHONE_CODE = 'phone_code',
}

export enum SecurityCodeChannel {
  EMAIL = 'email',
  PHONE = 'phone',
}

export class SecurityProofDto {
  @ApiProperty({ enum: SecurityVerificationMethod })
  @IsEnum(SecurityVerificationMethod)
  verificationMethod: SecurityVerificationMethod;

  @ApiPropertyOptional({ description: '使用密码确认身份时填写' })
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @ApiPropertyOptional({ description: '使用当前联系方式验证码确认身份时填写' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/, { message: '验证码必须为 6 位数字' })
  identityCode?: string;
}

export class SendIdentityCodeDto {
  @ApiProperty({ enum: SecurityCodeChannel })
  @IsEnum(SecurityCodeChannel)
  channel: SecurityCodeChannel;
}

export class VerifyIdentityResponseDto {
  @ApiProperty({ example: true })
  verified: true;
}

export class SendEmailChangeCodeDto {
  @ApiProperty({ description: '新邮箱' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;
}

export class SendPhoneChangeCodeDto {
  @ApiProperty({ example: '+86', enum: ['+86'] })
  @IsString()
  @Matches(/^\+86$/, { message: '首期仅支持中国大陆手机号（+86）' })
  countryCode: string;

  @ApiProperty({ example: '13800138000' })
  @IsString()
  @Matches(/^[1-9]\d{10}$/, { message: '手机号格式不正确' })
  phone: string;
}

export class ChangeEmailDto extends SecurityProofDto {
  @ApiProperty({ description: '新邮箱' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;

  @ApiProperty({ description: '新邮箱收到的验证码' })
  @IsString()
  @Matches(/^\d{6}$/, { message: '验证码必须为 6 位数字' })
  newCode: string;
}

export class ChangePhoneDto extends SecurityProofDto {
  @ApiProperty({ example: '+86', enum: ['+86'] })
  @IsString()
  @Matches(/^\+86$/, { message: '首期仅支持中国大陆手机号（+86）' })
  countryCode: string;

  @ApiProperty({ example: '13800138000' })
  @IsString()
  @Matches(/^[1-9]\d{10}$/, { message: '手机号格式不正确' })
  phone: string;

  @ApiProperty({ description: '新手机号收到的验证码' })
  @IsString()
  @Matches(/^\d{6}$/, { message: '验证码必须为 6 位数字' })
  newCode: string;
}

export class ChangePasswordDto extends SecurityProofDto {
  @ApiProperty({ minLength: 8, maxLength: 128 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword: string;
}

export class LoginActivitiesQueryDto {
  @ApiPropertyOptional({ type: Number, default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ type: Number, default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;
}

export class AccountSecurityResponseDto {
  @ApiProperty()
  hasPassword: boolean;

  @ApiPropertyOptional({ nullable: true, type: String, format: 'date-time' })
  passwordSetAt: Date | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  email: string | null;

  @ApiProperty()
  emailVerified: boolean;

  @ApiPropertyOptional({ nullable: true, type: String })
  countryCode: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  phone: string | null;

  @ApiProperty()
  phoneVerified: boolean;

  @ApiProperty({ enum: SecurityVerificationMethod, isArray: true })
  availableVerificationMethods: SecurityVerificationMethod[];
}

export class ContactChangeResponseDto {
  @ApiProperty({ type: AccountSecurityResponseDto })
  security: AccountSecurityResponseDto;

  @ApiProperty({ minimum: 0 })
  revokedSessionsCount: number;

  @ApiProperty()
  currentSessionPreserved: boolean;
}

export class SecuritySessionDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  deviceId: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  deviceInfo: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  userAgent: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  ip: string | null;

  @ApiProperty()
  current: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  lastActiveAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  expiresAt: Date;
}

export class LoginActivityDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  loginType: string;

  @ApiProperty()
  success: boolean;

  @ApiProperty()
  ip: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  userAgent: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  failReason: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;
}

export class LoginActivitiesResponseDto {
  @ApiProperty({ type: LoginActivityDto, isArray: true })
  items: LoginActivityDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  pageSize: number;

  @ApiProperty()
  totalPages: number;
}

export class SecurityCodeSentResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiPropertyOptional({ description: '身份确认码的脱敏接收目标' })
  maskedTarget?: string;
}
