import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrgIntegrationDto } from './dto/create-org-integration.dto';
import { UpdateOrgIntegrationDto } from './dto/update-org-integration.dto';
import { encryptConfig, maskConfig, decryptConfig } from '../common/utils/crypto.util';

const SENSITIVE_KEYS = [
  'appSecret',
  'encryptKey',
  'verificationToken',
  'secretId',
  'secretKey',
  'apiToken',
  'webhookSecret',
];

@Injectable()
export class OrgIntegrationService {
  constructor(private prisma: PrismaService) {}

  async create(orgId: string, createOrgIntegrationDto: CreateOrgIntegrationDto) {
    const encryptedConfig = encryptConfig(createOrgIntegrationDto.config || {}, SENSITIVE_KEYS);

    const integration = await this.prisma.orgIntegration.create({
      data: {
        orgId,
        platform: createOrgIntegrationDto.platform,
        config: encryptedConfig,
        active: createOrgIntegrationDto.active ?? true,
      },
    });

    return {
      ...integration,
      config: maskConfig(integration.config as any, SENSITIVE_KEYS),
    };
  }

  async findAll(orgId: string) {
    const integrations = await this.prisma.orgIntegration.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
    });

    return integrations.map(integration => ({
      ...integration,
      config: maskConfig(integration.config as any, SENSITIVE_KEYS),
    }));
  }

  async findOne(orgId: string, platform: string) {
    const integration = await this.prisma.orgIntegration.findUnique({
      where: {
        orgId_platform: {
          orgId,
          platform,
        },
      },
    });

    if (!integration) {
      throw new NotFoundException(`Integration config for platform ${platform} not found in org ${orgId}`);
    }
    return {
      ...integration,
      config: maskConfig(integration.config as any, SENSITIVE_KEYS),
    };
  }

  /**
   * 内部调用：获取解密后的真实配置
   */
  async getDecryptedConfig(orgId: string, platform: string) {
    const integration = await this.prisma.orgIntegration.findUnique({
      where: {
        orgId_platform: { orgId, platform },
      },
    });

    if (!integration || !integration.active) {
      return null;
    }

    return {
      ...integration,
      config: decryptConfig(integration.config as any, SENSITIVE_KEYS),
    };
  }

  async update(orgId: string, platform: string, updateOrgIntegrationDto: UpdateOrgIntegrationDto) {
    // Check if it exists
    const existing = await this.prisma.orgIntegration.findUnique({
      where: {
        orgId_platform: { orgId, platform },
      },
    });
    if (!existing) {
      throw new NotFoundException(`Integration config for platform ${platform} not found in org ${orgId}`);
    }

    // Merge old config and new config to avoid overwriting ****** with ******
    const newConfig = { ...((existing.config as any) || {}) };
    if (updateOrgIntegrationDto.config) {
      for (const [k, v] of Object.entries(updateOrgIntegrationDto.config)) {
        if (v !== '******') {
          newConfig[k] = v;
        }
      }
    }

    const encryptedConfig = encryptConfig(newConfig, SENSITIVE_KEYS);

    const updated = await this.prisma.orgIntegration.update({
      where: {
        orgId_platform: { orgId, platform },
      },
      data: {
        config: encryptedConfig,
        active: updateOrgIntegrationDto.active,
      },
    });

    return {
      ...updated,
      config: maskConfig(updated.config as any, SENSITIVE_KEYS),
    };
  }

  async remove(orgId: string, platform: string) {
    // Check if it exists
    await this.findOne(orgId, platform);

    return this.prisma.orgIntegration.delete({
      where: {
        orgId_platform: {
          orgId,
          platform,
        },
      },
    });
  }
}
