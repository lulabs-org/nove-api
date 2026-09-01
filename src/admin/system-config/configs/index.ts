export * from './ai.config';
export * from './lark.config';
export * from './mail.config';
export * from './system-config.types';
export * from './system-config.constants';
export * from './system-config.definition';
export * from './tencent-meeting.config';
export * from './wechat-shop.config';

import { aiConfig } from './ai.config';
import { larkConfig } from './lark.config';
import { mailConfig } from './mail.config';
import { tencentMeetingConfig } from './tencent-meeting.config';
import { wechatShopConfig } from './wechat-shop.config';
import { ConfigRegistryEntry } from './system-config.definition';

export type ConfigSource = 'database' | 'default';

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
