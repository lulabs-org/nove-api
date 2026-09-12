import { IsString, IsOptional } from 'class-validator';
import { defineIntegrationConfig } from '../utils';

export class UpdateStripeConfigDto {
  @IsString()
  @IsOptional()
  secretKey?: string;

  @IsString()
  @IsOptional()
  publishableKey?: string;

  @IsString()
  @IsOptional()
  webhookSecret?: string;

  @IsString()
  @IsOptional()
  currency?: string;
}

export const stripeConfig = defineIntegrationConfig(
  UpdateStripeConfigDto,
  {
    description: 'Organization Stripe Payment Configuration',
    defaults: {
      currency: 'USD',
    },
    required: ['secretKey'],
    secrets: ['secretKey', 'webhookSecret'],
  },
);
