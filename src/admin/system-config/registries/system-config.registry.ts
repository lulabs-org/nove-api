import { Type } from '@nestjs/common';
import { UpdateAiConfigDto } from '../dto/ai-config.dto';
import { UpdateLarkConfigDto } from '../dto/lark-config.dto';
import { UpdateMailConfigDto } from '../dto/mail-config.dto';
import { UpdateTencentMeetingConfigDto } from '../dto/tencent-meeting-config.dto';
import { UpdateWechatShopConfigDto } from '../dto/wechat-shop-config.dto';

export const SYSTEM_CONFIG_MODULES = [
  'mail',
  'ai',
  'tencent-meeting',
  'lark',
  'wechat-shop',
] as const;

export type SystemConfigModuleName = (typeof SYSTEM_CONFIG_MODULES)[number];
export type ConfigSource = 'database' | 'default';
export type SystemConfigValue = string | number | boolean;
export type SystemConfigValues = Record<string, SystemConfigValue>;
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

export interface BootstrapEnvironmentConfig {
  values: SystemConfigValues;
  fields: string[];
}

export interface ConfigRegistryEntry {
  dto: Type<object>;
  secretFields: string[];
  requiredFields: string[];
  description: string;
  defaults: SystemConfigValues;
  bootstrapEnvironment: () => BootstrapEnvironmentConfig;
}

function compactEnvironment(
  values: Record<string, SystemConfigValue | undefined>,
  environmentFields: Record<string, string | undefined>,
): BootstrapEnvironmentConfig {
  return {
    values: Object.fromEntries(
      Object.entries(values).filter(
        ([, value]) => value !== undefined && value !== '',
      ),
    ) as SystemConfigValues,
    fields: Object.entries(environmentFields)
      .filter(([, value]) => value !== undefined && value.trim() !== '')
      .map(([field]) => field),
  };
}

export const SystemConfigRegistry: Record<
  SystemConfigModuleName,
  ConfigRegistryEntry
> = {
  mail: {
    dto: UpdateMailConfigDto,
    secretFields: ['pass'],
    requiredFields: ['host', 'port', 'user', 'pass', 'from'],
    description: 'Organization Mail Configuration',
    defaults: {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      brandName: 'Nove System',
      brandPrimaryColor: '#2563eb',
      brandFooterText: '此邮件由 Nove System 自动发送，请勿回复。',
    },
    bootstrapEnvironment: () => {
      const brandName = process.env.EMAIL_BRAND_NAME?.trim();
      const user = process.env.SMTP_USER?.trim();
      const from = process.env.SMTP_FROM?.trim() || user;
      return compactEnvironment(
        {
          host: process.env.SMTP_HOST?.trim(),
          port: process.env.SMTP_PORT
            ? Number(process.env.SMTP_PORT)
            : undefined,
          secure: process.env.SMTP_SECURE
            ? process.env.SMTP_SECURE === 'true'
            : undefined,
          user,
          pass: process.env.SMTP_PASS,
          from,
          brandName,
          brandLogoUrl: process.env.EMAIL_BRAND_LOGO_URL?.trim(),
          brandPrimaryColor: process.env.EMAIL_BRAND_PRIMARY_COLOR?.trim(),
          brandFooterText:
            process.env.EMAIL_BRAND_FOOTER_TEXT?.trim() ||
            (brandName
              ? `此邮件由 ${brandName} 自动发送，请勿回复。`
              : undefined),
          brandPublicBaseUrl: process.env.EMAIL_BRAND_PUBLIC_BASE_URL?.trim(),
        },
        {
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          secure: process.env.SMTP_SECURE,
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          brandName: process.env.EMAIL_BRAND_NAME,
          brandLogoUrl: process.env.EMAIL_BRAND_LOGO_URL,
          brandPrimaryColor: process.env.EMAIL_BRAND_PRIMARY_COLOR,
          brandFooterText: process.env.EMAIL_BRAND_FOOTER_TEXT,
          brandPublicBaseUrl: process.env.EMAIL_BRAND_PUBLIC_BASE_URL,
        },
      );
    },
  },
  ai: {
    dto: UpdateAiConfigDto,
    secretFields: ['apiKey'],
    requiredFields: ['apiKey', 'baseUrl', 'model'],
    description: 'Organization AI Model Configuration',
    defaults: {
      provider: 'custom',
      baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
      model: '{TEMPLATE_ENDPOINT_ID}',
      maxTokens: 16000,
      temperature: 0.7,
    },
    bootstrapEnvironment: () => {
      const arkKey = process.env.ARK_API_KEY;
      const openaiKey = process.env.OPENAI_API_KEY;
      const apiKey = arkKey || openaiKey;
      return compactEnvironment(
        {
          provider: arkKey ? 'ark' : openaiKey ? 'openai' : undefined,
          apiKey,
          baseUrl: process.env.OPENAI_BASE_URL?.trim(),
          model: process.env.OPENAI_MODEL?.trim(),
          maxTokens: process.env.OPENAI_MAX_TOKENS
            ? Number(process.env.OPENAI_MAX_TOKENS)
            : undefined,
          temperature: process.env.OPENAI_TEMPERATURE
            ? Number(process.env.OPENAI_TEMPERATURE)
            : undefined,
        },
        {
          provider: apiKey,
          apiKey,
          baseUrl: process.env.OPENAI_BASE_URL,
          model: process.env.OPENAI_MODEL,
          maxTokens: process.env.OPENAI_MAX_TOKENS,
          temperature: process.env.OPENAI_TEMPERATURE,
        },
      );
    },
  },
  'tencent-meeting': {
    dto: UpdateTencentMeetingConfigDto,
    secretFields: ['secretId', 'secretKey', 'webhookToken', 'encodingAesKey'],
    requiredFields: ['appId', 'sdkId', 'secretId', 'secretKey', 'userId'],
    description: 'Organization Tencent Meeting Configuration',
    defaults: {},
    bootstrapEnvironment: () =>
      compactEnvironment(
        {
          appId: process.env.TENCENT_MEETING_APP_ID?.trim(),
          sdkId: process.env.TENCENT_MEETING_SDK_ID?.trim(),
          secretId: process.env.TENCENT_MEETING_SECRET_ID,
          secretKey: process.env.TENCENT_MEETING_SECRET_KEY,
          userId: process.env.USER_ID?.trim(),
          webhookToken: process.env.TENCENT_MEETING_TOKEN,
          encodingAesKey: process.env.TENCENT_MEETING_ENCODING_AES_KEY,
        },
        {
          appId: process.env.TENCENT_MEETING_APP_ID,
          sdkId: process.env.TENCENT_MEETING_SDK_ID,
          secretId: process.env.TENCENT_MEETING_SECRET_ID,
          secretKey: process.env.TENCENT_MEETING_SECRET_KEY,
          userId: process.env.USER_ID,
          webhookToken: process.env.TENCENT_MEETING_TOKEN,
          encodingAesKey: process.env.TENCENT_MEETING_ENCODING_AES_KEY,
        },
      ),
  },
  lark: {
    dto: UpdateLarkConfigDto,
    secretFields: [
      'appSecret',
      'eventEncryptKey',
      'eventVerificationToken',
      'bitableAppToken',
    ],
    requiredFields: [
      'appId',
      'appSecret',
      'bitableAppToken',
      'meetingTableId',
      'meetingUserTableId',
      'recordingFileTableId',
      'personalSummaryTableId',
    ],
    description: 'Organization Lark Configuration',
    defaults: {},
    bootstrapEnvironment: () =>
      compactEnvironment(
        {
          appId: process.env.LARK_APP_ID?.trim(),
          appSecret: process.env.LARK_APP_SECRET,
          eventEncryptKey: process.env.LARK_EVENT_ENCRYPT_KEY,
          eventVerificationToken: process.env.LARK_EVENT_VERIFICATION_TOKEN,
          bitableAppToken: process.env.LARK_BITABLE_APP_TOKEN,
          meetingTableId: process.env.LARK_TABLE_MEETING_RECORD?.trim(),
          meetingUserTableId: process.env.LARK_TABLE_MEETING_USER?.trim(),
          recordingFileTableId:
            process.env.LARK_TABLE_MEETING_RECORDING?.trim(),
          personalSummaryTableId:
            process.env.LARK_TABLE_PERSONAL_MEETING_SUMMARY?.trim(),
        },
        {
          appId: process.env.LARK_APP_ID,
          appSecret: process.env.LARK_APP_SECRET,
          eventEncryptKey: process.env.LARK_EVENT_ENCRYPT_KEY,
          eventVerificationToken: process.env.LARK_EVENT_VERIFICATION_TOKEN,
          bitableAppToken: process.env.LARK_BITABLE_APP_TOKEN,
          meetingTableId: process.env.LARK_TABLE_MEETING_RECORD,
          meetingUserTableId: process.env.LARK_TABLE_MEETING_USER,
          recordingFileTableId: process.env.LARK_TABLE_MEETING_RECORDING,
          personalSummaryTableId:
            process.env.LARK_TABLE_PERSONAL_MEETING_SUMMARY,
        },
      ),
  },
  'wechat-shop': {
    dto: UpdateWechatShopConfigDto,
    secretFields: ['appSecret', 'webhookToken', 'encodingAesKey'],
    requiredFields: ['appId', 'appSecret'],
    description: 'Organization Wechat Shop Configuration',
    defaults: { apiBaseUrl: 'https://api.weixin.qq.com' },
    bootstrapEnvironment: () =>
      compactEnvironment(
        {
          appId: process.env.WECHAT_SHOP_APP_ID?.trim(),
          appSecret: process.env.WECHAT_SHOP_APP_SECRET,
          webhookToken: process.env.WECHAT_SHOP_WEBHOOK_TOKEN,
          encodingAesKey: process.env.WECHAT_SHOP_ENCODING_AES_KEY,
          apiBaseUrl: (
            process.env.WECHAT_SHOP_API_BASE_URL ??
            process.env.WECHAT_API_BASE_URL
          )?.trim(),
        },
        {
          appId: process.env.WECHAT_SHOP_APP_ID,
          appSecret: process.env.WECHAT_SHOP_APP_SECRET,
          webhookToken: process.env.WECHAT_SHOP_WEBHOOK_TOKEN,
          encodingAesKey: process.env.WECHAT_SHOP_ENCODING_AES_KEY,
          apiBaseUrl:
            process.env.WECHAT_SHOP_API_BASE_URL ??
            process.env.WECHAT_API_BASE_URL,
        },
      ),
  },
};

export function isSystemConfigModule(
  value: string,
): value is SystemConfigModuleName {
  return SYSTEM_CONFIG_MODULES.includes(value as SystemConfigModuleName);
}
