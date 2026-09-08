import { Type } from '@nestjs/common';

export type IntegrationValue = string | number | boolean;
export type IntegrationValues = Record<string, IntegrationValue>;

export interface IntegrationDefinition<TDto extends object = object> {
  dto: Type<TDto>;
  description: string;
  defaults?: Partial<Record<keyof TDto & string, IntegrationValue>>;
  required?: (keyof TDto & string)[];
  secrets?: (keyof TDto & string)[];
  restartRequiredOn?: (keyof TDto & string)[];
}

export interface IntegrationRegistryEntry {
  dto: Type<object>;
  description: string;
  defaults?: IntegrationValues;
  required?: string[];
  secrets?: string[];
  restartRequiredOn?: string[];
}

export interface IntegrationTestProvider {
  test(value: IntegrationValues): Promise<void>;
}

export type ConfigSource = 'database' | 'default';

export type IntegrationModuleName =
  | 'mail'
  | 'ai'
  | 'tencent-meeting'
  | 'lark'
  | 'wechat-shop';

export interface EffectiveIntegration {
  orgId: string;
  module: IntegrationModuleName;
  value: IntegrationValues;
  configured: boolean;
  source: ConfigSource;
  updatedAt: Date | null;
}

export interface PublicIntegration extends EffectiveIntegration {
  value: IntegrationValues;
}

export interface TestResult {
  orgId: string;
  success: boolean;
  message: string;
}
