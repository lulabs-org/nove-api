import { Type } from '@nestjs/common';
import { UpdateMailConfigDto } from './dto/mail-config.dto';
import { UpdateWechatShopConfigDto } from './dto/wechat-shop-config.dto';

export interface ConfigRegistryEntry {
  dto: Type<any>;
  secretFields: string[]; // Fields that should be encrypted and masked
  description: string;
}

export const SystemConfigRegistry: Record<string, ConfigRegistryEntry> = {
  mail: {
    dto: UpdateMailConfigDto,
    secretFields: ['pass'],
    description: 'Global Mail Configuration',
  },
  'wechat-shop': {
    dto: UpdateWechatShopConfigDto,
    secretFields: ['appSecret', 'webhookToken', 'encodingAesKey'],
    description: 'Global Wechat Shop Configuration',
  },
};
