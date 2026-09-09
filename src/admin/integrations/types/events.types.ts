import { IntegrationModuleName, IntegrationValues } from './integration.types';

export interface IntegrationChangeEvent {
  orgId: string;
  value: IntegrationValues;
}

export const INTEGRATION_EVENT_PATTERNS = {
  MAIL_UPDATED: 'config.mail.updated',
  MAIL_DELETED: 'config.mail.deleted',
  AI_UPDATED: 'config.ai.updated',
  AI_DELETED: 'config.ai.deleted',
  TMEET_UPDATED: 'config.tencent-meeting.updated',
  TMEET_DELETED: 'config.tencent-meeting.deleted',
  LARK_UPDATED: 'config.lark.updated',
  LARK_DELETED: 'config.lark.deleted',
  WECHAT_SHOP_UPDATED: 'config.wechat-shop.updated',
  WECHAT_SHOP_DELETED: 'config.wechat-shop.deleted',
  STORAGE_UPDATED: 'config.storage.updated',
  STORAGE_DELETED: 'config.storage.deleted',
} as const;

export const IntegrationEvents = {
  updated: (module: IntegrationModuleName) =>
    `config.${module}.updated` as const,
  deleted: (module: IntegrationModuleName) =>
    `config.${module}.deleted` as const,
};
