import { Type } from '@nestjs/common';

export type SystemConfigValue = string | number | boolean;
export type SystemConfigValues = Record<string, SystemConfigValue>;

export interface ConfigDefinition<TDto extends object = object> {
  dto: Type<TDto>;
  description: string;
  defaults?: Partial<Record<keyof TDto & string, SystemConfigValue>>;
  required?: (keyof TDto & string)[];
  secrets?: (keyof TDto & string)[];
  restartRequiredOn?: (keyof TDto & string)[];
}

export interface ConfigRegistryEntry {
  dto: Type<object>;
  description: string;
  defaults?: SystemConfigValues;
  required?: string[];
  secrets?: string[];
  restartRequiredOn?: string[];
}

export interface ConfigTestProvider {
  test(value: SystemConfigValues): Promise<void>;
}
