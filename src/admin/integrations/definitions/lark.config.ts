import { IsOptional, IsString } from 'class-validator';
import { defineIntegrationConfig } from '../utils';

export class UpdateLarkConfigDto {
  @IsOptional()
  @IsString()
  appId?: string;

  @IsOptional()
  @IsString()
  appSecret?: string;

  @IsOptional()
  @IsString()
  eventEncryptKey?: string;

  @IsOptional()
  @IsString()
  eventVerificationToken?: string;
}

export const larkConfig = defineIntegrationConfig(UpdateLarkConfigDto, {
  description: 'Organization Lark Configuration',
  required: ['appId', 'appSecret'],
  secrets: ['appSecret', 'eventEncryptKey', 'eventVerificationToken'],
  restartRequiredOn: ['appId', 'appSecret'],
});
