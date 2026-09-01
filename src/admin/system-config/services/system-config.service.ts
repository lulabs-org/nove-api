import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SystemConfigRepository } from '../repositories/system-config.repository';
import {
  ConfigSource,
  isSystemConfigModule,
  SYSTEM_CONFIG_ENV_IMPORT_KEY,
  SYSTEM_CONFIG_MODULES,
  SystemConfigEnvironmentImportMetadata,
  SystemConfigModuleName,
  SystemConfigRegistry,
  SystemConfigValues,
} from '../registries/system-config.registry';
import { ConfigCodecService } from './config-codec.service';

export interface EffectiveSystemConfig {
  orgId: string;
  module: SystemConfigModuleName;
  value: SystemConfigValues;
  configured: boolean;
  source: ConfigSource;
  updatedAt: Date | null;
  environmentImportedAt: string | null;
  environmentImportedFields: string[];
}

export interface SystemConfigChangeEvent {
  orgId: string;
  value: SystemConfigValues;
}

export interface PublicSystemConfig extends EffectiveSystemConfig {
  value: SystemConfigValues;
}

@Injectable()
export class SystemConfigService {
  private readonly logger = new Logger(SystemConfigService.name);

  constructor(
    private readonly configRepository: SystemConfigRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly codec: ConfigCodecService,
  ) {}

  private getModuleKey(module: SystemConfigModuleName): string {
    return `${module.toUpperCase()}_CONFIG`;
  }

  private assertModule(module: string): SystemConfigModuleName {
    if (!isSystemConfigModule(module)) {
      throw new NotFoundException(
        `Module configuration for '${module}' not found in registry`,
      );
    }
    return module;
  }

  async getRawConfig(orgId: string, module: string) {
    const moduleName = this.assertModule(module);
    return this.configRepository.findByKey(
      orgId,
      this.getModuleKey(moduleName),
    );
  }

  async getEffectiveConfig(
    orgId: string,
    module: string,
  ): Promise<EffectiveSystemConfig> {
    const moduleName = this.assertModule(module);
    const entry = SystemConfigRegistry[moduleName];
    const stored = await this.configRepository.findByKey(
      orgId,
      this.getModuleKey(moduleName),
    );
    const databaseValue = (stored?.value ?? {}) as SystemConfigValues;
    const decryptedDatabaseValue = this.codec.decode(
      entry,
      databaseValue,
      (field) =>
        this.logger.error(
          `Failed to decrypt ${moduleName}.${field}; database override ignored`,
        ),
    );
    const value = {
      ...this.codec.defaults(entry),
      ...decryptedDatabaseValue,
    };
    const source: ConfigSource = stored ? 'database' : 'default';
    const importMetadata = await this.getEnvironmentImportMetadata(
      orgId,
      moduleName,
    );

    const configured = this.codec.isConfigured(entry, value);

    return {
      orgId,
      module: moduleName,
      value,
      configured,
      source,
      updatedAt: stored?.updatedAt ?? null,
      environmentImportedAt:
        importMetadata.fields.length > 0 ? importMetadata.completedAt : null,
      environmentImportedFields: importMetadata.fields,
    };
  }

  async listConfigs(orgId: string) {
    return Promise.all(
      SYSTEM_CONFIG_MODULES.map(async (module) => {
        const config = await this.getEffectiveConfig(orgId, module);
        return {
          orgId: config.orgId,
          module: config.module,
          configured: config.configured,
          source: config.source,
          updatedAt: config.updatedAt,
          environmentImportedAt: config.environmentImportedAt,
          environmentImportedFields: config.environmentImportedFields,
        };
      }),
    );
  }

  async getConfig(orgId: string, module: string): Promise<PublicSystemConfig> {
    const effective = await this.getEffectiveConfig(orgId, module);
    const entry = SystemConfigRegistry[effective.module];
    return { ...effective, value: this.codec.mask(entry, effective.value) };
  }

  async resolveDraftConfig(
    orgId: string,
    module: string,
    data: Record<string, unknown>,
  ): Promise<EffectiveSystemConfig> {
    const current = await this.getEffectiveConfig(orgId, module);
    await this.validateData(current.module, data);
    const entry = SystemConfigRegistry[current.module];
    const value = this.codec.mergeDraft(entry, current.value, data);
    const missingFields = this.codec.missingRequiredFields(entry, value);
    if (missingFields.length > 0) {
      throw new BadRequestException(
        `Missing required configuration: ${missingFields.join(', ')}`,
      );
    }

    return { ...current, value };
  }

  async updateConfig(
    orgId: string,
    module: string,
    data: Record<string, unknown>,
  ) {
    const moduleName = this.assertModule(module);
    const entry = SystemConfigRegistry[moduleName];
    await this.validateData(moduleName, data);

    const before = await this.getEffectiveConfig(orgId, moduleName);
    const key = this.getModuleKey(moduleName);
    const existing = await this.configRepository.findByKey(orgId, key);
    const currentConfig = (existing?.value ?? {}) as Record<string, unknown>;
    const newConfig = this.codec.encodeUpdate(entry, currentConfig, data);

    await this.configRepository.upsert(
      orgId,
      key,
      newConfig as Prisma.InputJsonValue,
      this.codec.containsEncryptedValues(entry, newConfig),
      entry.description,
    );

    const after = await this.getEffectiveConfig(orgId, moduleName);
    const restartRequired =
      moduleName === 'lark' &&
      (before.value.appId !== after.value.appId ||
        before.value.appSecret !== after.value.appSecret);

    this.eventEmitter.emit(`config.${moduleName}.updated`, {
      orgId,
      value: after.value,
    } satisfies SystemConfigChangeEvent);
    this.logger.log(`${entry.description} updated by admin.`);

    return {
      orgId,
      success: true,
      message: restartRequired
        ? '配置已保存；飞书事件长连接需重启 API 后生效'
        : '配置已保存并生效',
      restartRequired,
    };
  }

  async deleteConfig(orgId: string, module: string) {
    const moduleName = this.assertModule(module);
    const key = this.getModuleKey(moduleName);
    const existing = await this.configRepository.findByKey(orgId, key);

    if (!existing) {
      throw new NotFoundException(
        `Configuration for module '${moduleName}' does not exist`,
      );
    }

    await this.configRepository.delete(orgId, key);
    const fallback = await this.getEffectiveConfig(orgId, moduleName);
    const restartRequired = moduleName === 'lark';
    this.eventEmitter.emit(`config.${moduleName}.deleted`, {
      orgId,
      value: fallback.value,
    } satisfies SystemConfigChangeEvent);
    this.logger.log(
      `${SystemConfigRegistry[moduleName].description} deleted by admin.`,
    );

    return {
      orgId,
      success: true,
      message: restartRequired
        ? '配置已删除；飞书事件长连接需重启 API'
        : '配置已删除，服务已变为未配置',
      restartRequired,
    };
  }

  private async getEnvironmentImportMetadata(
    orgId: string,
    module: SystemConfigModuleName,
  ): Promise<{ completedAt: string | null; fields: string[] }> {
    const marker = await this.configRepository.findByKey(
      orgId,
      SYSTEM_CONFIG_ENV_IMPORT_KEY,
    );
    if (!marker) return { completedAt: null, fields: [] };

    const metadata =
      marker.value as unknown as Partial<SystemConfigEnvironmentImportMetadata>;
    const moduleMetadata = metadata.modules?.[module];
    return {
      completedAt:
        typeof metadata.completedAt === 'string' ? metadata.completedAt : null,
      fields: Array.isArray(moduleMetadata?.fields)
        ? moduleMetadata.fields.filter(
            (field): field is string => typeof field === 'string',
          )
        : [],
    };
  }

  private async validateData(
    module: SystemConfigModuleName,
    data: Record<string, unknown>,
  ): Promise<void> {
    const dtoInstance = plainToInstance(SystemConfigRegistry[module].dto, data);
    const errors = await validate(dtoInstance, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (errors.length === 0) return;

    const messages = errors
      .flatMap((error) => Object.values(error.constraints ?? {}))
      .join('; ');
    throw new BadRequestException(`Validation failed: ${messages}`);
  }
}
