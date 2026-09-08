import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { defineSystemConfig } from '../core';

export class UpdateLarkConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  appId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  appSecret?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  eventEncryptKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  eventVerificationToken?: string;
}

export const larkConfig = defineSystemConfig(UpdateLarkConfigDto, {
  description: 'Organization Lark Configuration',
  required: ['appId', 'appSecret'],
  secrets: ['appSecret', 'eventEncryptKey', 'eventVerificationToken'],
  restartRequiredOn: ['appId', 'appSecret'],
});
