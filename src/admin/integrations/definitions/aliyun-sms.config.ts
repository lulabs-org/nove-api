import { IsOptional, IsString, Matches } from 'class-validator';
import { defineIntegrationConfig } from '../utils';

export class UpdateAliyunSmsConfigDto {
  @IsOptional()
  @IsString()
  accessKeyId?: string;

  @IsOptional()
  @IsString()
  accessKeySecret?: string;

  @IsOptional()
  @IsString()
  signName?: string;

  @IsOptional()
  @Matches(/^SMS_[A-Za-z0-9]+$/)
  registerTemplateCode?: string;

  @IsOptional()
  @Matches(/^SMS_[A-Za-z0-9]+$/)
  loginTemplateCode?: string;

  @IsOptional()
  @Matches(/^SMS_[A-Za-z0-9]+$/)
  resetPasswordTemplateCode?: string;

  @IsOptional()
  @Matches(/^SMS_[A-Za-z0-9]+$/)
  securityChangeTemplateCode?: string;
}

export const aliyunSmsConfig = defineIntegrationConfig(
  UpdateAliyunSmsConfigDto,
  {
    description: 'Aliyun SMS Configuration',
    required: [
      'accessKeyId',
      'accessKeySecret',
      'signName',
      'registerTemplateCode',
      'loginTemplateCode',
      'resetPasswordTemplateCode',
      'securityChangeTemplateCode',
    ],
    secrets: ['accessKeyId', 'accessKeySecret'],
  },
);
