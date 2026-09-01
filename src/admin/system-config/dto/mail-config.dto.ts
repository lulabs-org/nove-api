import {
  IsString,
  IsInt,
  IsBoolean,
  IsOptional,
  IsUrl,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateMailConfigDto {
  @ApiPropertyOptional({ description: 'SMTP Host', example: 'smtp.gmail.com' })
  @IsOptional()
  @IsString()
  host?: string;

  @ApiPropertyOptional({ description: 'SMTP Port', example: 587 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

  @ApiPropertyOptional({ description: 'Use Secure/SSL', example: false })
  @IsOptional()
  @IsBoolean()
  secure?: boolean;

  @ApiPropertyOptional({
    description: 'SMTP User',
    example: 'user@example.com',
  })
  @IsOptional()
  @IsString()
  user?: string;

  @ApiPropertyOptional({ description: 'SMTP Password (will be encrypted)' })
  @IsString()
  @IsOptional()
  pass?: string;

  @ApiPropertyOptional({
    description: 'From Email Address',
    example: 'noreply@example.com',
  })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brandName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  brandLogoUrl?: string;

  @ApiPropertyOptional({ example: '#2563eb' })
  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/)
  brandPrimaryColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brandFooterText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_tld: false })
  brandPublicBaseUrl?: string;
}
