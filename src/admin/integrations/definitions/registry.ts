import { aiConfig } from './ai.config';
import { larkConfig } from './lark.config';
import { mailConfig } from './mail.config';
import { tencentMeetingConfig } from './tencent-meeting.config';
import { wechatShopConfig } from './wechat-shop.config';
import {
  ConfigSource,
  IntegrationModuleName,
  IntegrationRegistryEntry,
} from '../types';

export { ConfigSource, IntegrationModuleName };

export const IntegrationRegistry = {
  mail: mailConfig,
  ai: aiConfig,
  'tencent-meeting': tencentMeetingConfig,
  lark: larkConfig,
  'wechat-shop': wechatShopConfig,
} as const satisfies Record<IntegrationModuleName, IntegrationRegistryEntry>;

export const INTEGRATION_MODULES = Object.keys(
  IntegrationRegistry,
) as IntegrationModuleName[];

export function isIntegrationModule(
  value: string,
): value is IntegrationModuleName {
  return value in IntegrationRegistry;
}
