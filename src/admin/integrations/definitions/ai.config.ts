import { ApiPropertyOptional } from '@nestjs/swagger';
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
import { defineIntegrationConfig } from '../core';

export class UpdateAiConfigDto {
  @ApiPropertyOptional({ enum: ['ark', 'openai', 'custom'] })
  @IsOptional()
  @IsIn(['ark', 'openai', 'custom'])
  provider?: 'ark' | 'openai' | 'custom';

  @ApiPropertyOptional({ description: 'OpenAI-compatible API key' })
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiPropertyOptional({ description: 'OpenAI-compatible API base URL' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  baseUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxTokens?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 2 })
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

