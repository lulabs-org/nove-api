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

// Backward compatibility aliases
export type SystemConfigValue = IntegrationValue;
export type SystemConfigValues = IntegrationValues;
export type ConfigDefinition<TDto extends object = object> = IntegrationDefinition<TDto>;
export type ConfigRegistryEntry = IntegrationRegistryEntry;
export type ConfigTestProvider = IntegrationTestProvider;
