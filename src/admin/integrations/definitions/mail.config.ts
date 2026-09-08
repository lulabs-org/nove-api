import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { defineIntegrationConfig } from '../utils';

export class UpdateMailConfigDto {
  @IsOptional()
  @IsString()
  host?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

  @IsOptional()
  @IsBoolean()
  secure?: boolean;

  @IsOptional()
  @IsString()
  user?: string;

  @IsString()
  @IsOptional()
  pass?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  brandName?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  brandLogoUrl?: string;

  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/)
  brandPrimaryColor?: string;

  @IsOptional()
  @IsString()
  brandFooterText?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  brandPublicBaseUrl?: string;
}

export const mailConfig = defineIntegrationConfig(UpdateMailConfigDto, {
  description: 'Organization Mail Configuration',
  defaults: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    brandName: 'Nove System',
    brandPrimaryColor: '#2563eb',
    brandFooterText: '此邮件由 Nove System 自动发送，请勿回复。',
  },
  required: ['host', 'port', 'user', 'pass', 'from'],
  secrets: ['pass'],
});
