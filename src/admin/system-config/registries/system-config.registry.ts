import {
  aiConfig,
  ConfigRegistryEntry,
  larkConfig,
  mailConfig,
  tencentMeetingConfig,
  wechatShopConfig,
} from '../configs';

export type ConfigSource = 'database' | 'default';
export type {
  BootstrapEnvironmentConfig,
  ConfigRegistryEntry,
  SystemConfigValue,
  SystemConfigValues,
} from '../configs';

export const SystemConfigRegistry = {
  mail: mailConfig,
  ai: aiConfig,
  'tencent-meeting': tencentMeetingConfig,
  lark: larkConfig,
  'wechat-shop': wechatShopConfig,
} as const satisfies Record<string, ConfigRegistryEntry>;

export type SystemConfigModuleName = keyof typeof SystemConfigRegistry;

export const SYSTEM_CONFIG_MODULES = Object.keys(
  SystemConfigRegistry,
) as SystemConfigModuleName[];

export function isSystemConfigModule(
  value: string,
): value is SystemConfigModuleName {
  return value in SystemConfigRegistry;
}
