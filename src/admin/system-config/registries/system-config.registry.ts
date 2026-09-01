import {
  aiConfig,
  ConfigRegistryEntry,
  larkConfig,
  mailConfig,
  tencentMeetingConfig,
  wechatShopConfig,
} from '../configs';

export const SYSTEM_CONFIG_MODULES = [
  'mail',
  'ai',
  'tencent-meeting',
  'lark',
  'wechat-shop',
] as const;

export type SystemConfigModuleName = (typeof SYSTEM_CONFIG_MODULES)[number];
export type ConfigSource = 'database' | 'default';
export type {
  BootstrapEnvironmentConfig,
  ConfigRegistryEntry,
  SystemConfigValue,
  SystemConfigValues,
} from '../configs';
export const SYSTEM_CONFIG_ENV_IMPORT_KEY = 'SYSTEM_CONFIG_ENV_IMPORT_V1';

export interface SystemConfigEnvironmentImportModule {
  status: 'imported' | 'existing' | 'skipped';
  fields: string[];
  configured: boolean;
}

export interface SystemConfigEnvironmentImportMetadata {
  version: 1;
  completedAt: string;
  modules: Record<SystemConfigModuleName, SystemConfigEnvironmentImportModule>;
}

export const SystemConfigRegistry: Record<
  SystemConfigModuleName,
  ConfigRegistryEntry
> = {
  mail: mailConfig,
  ai: aiConfig,
  'tencent-meeting': tencentMeetingConfig,
  lark: larkConfig,
  'wechat-shop': wechatShopConfig,
};

export function isSystemConfigModule(
  value: string,
): value is SystemConfigModuleName {
  return SYSTEM_CONFIG_MODULES.includes(value as SystemConfigModuleName);
}
