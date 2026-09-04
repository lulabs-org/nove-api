import { aiConfig } from './ai.config';
import { larkConfig } from './lark.config';
import { mailConfig } from './mail.config';
import { tencentMeetingConfig } from './tencent-meeting.config';
import { wechatShopConfig } from './wechat-shop.config';
import { driveConfig } from './drive.config';
import { ConfigRegistryEntry } from '../core';

export type ConfigSource = 'database' | 'default';

export const SystemConfigRegistry = {
  mail: mailConfig,
  ai: aiConfig,
  'tencent-meeting': tencentMeetingConfig,
  lark: larkConfig,
  'wechat-shop': wechatShopConfig,
  drive: driveConfig,
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
