import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
} from 'class-validator';
import { defineIntegrationConfig } from '../utils';

export class UpdateAiConfigDto {
  @IsOptional()
  @IsIn(['ark', 'openai', 'custom'])
  provider?: 'ark' | 'openai' | 'custom';

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  baseUrl?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxTokens?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;
}

export const aiConfig = defineIntegrationConfig(UpdateAiConfigDto, {
  description: 'Organization AI Model Configuration',
  defaults: {
    maxTokens: 16000,
    temperature: 0.7,
  },
  required: ['apiKey', 'baseUrl', 'model'],
  secrets: ['apiKey'],
});
