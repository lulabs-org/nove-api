import { Type } from '@nestjs/common';

export type SystemConfigValue = string | number | boolean;
export type SystemConfigValues = Record<string, SystemConfigValue>;

export interface EnvironmentSource<
  TValue extends SystemConfigValue = SystemConfigValue,
> {
  key: string;
  read: (environment: NodeJS.ProcessEnv) => TValue | undefined;
}

export interface ConfigFieldDefinition<
  TValue extends SystemConfigValue = SystemConfigValue,
> {
  required?: boolean;
  secret?: boolean;
  default?: TValue;
  environment?: EnvironmentSource<TValue>;
}

export type DtoFieldValue<TValue> =
  Exclude<TValue, null | undefined> extends SystemConfigValue
    ? Exclude<TValue, null | undefined>
    : SystemConfigValue;

export type ConfigFields<TDto extends object> = {
  [TKey in keyof TDto]-?: ConfigFieldDefinition<DtoFieldValue<TDto[TKey]>>;
};

export interface ConfigDefinition<TDto extends object> {
  dto: Type<TDto>;
  description: string;
  fields: ConfigFields<TDto>;
  restartRequiredOn?: Extract<keyof TDto, string>[];
}

export interface ConfigRegistryEntry {
  dto: Type<object>;
  description: string;
  fields: Record<string, ConfigFieldDefinition>;
  restartRequiredOn?: string[];
}

export interface ConfigTestProvider {
  test(value: SystemConfigValues): Promise<void>;
}

