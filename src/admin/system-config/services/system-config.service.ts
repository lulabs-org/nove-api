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
  readEnvironment,
  SystemConfigValues,
} from '../core';
import {
  ConfigSource,
  isSystemConfigModule,
  SYSTEM_CONFIG_MODULES,
  SystemConfigModuleName,
  SystemConfigRegistry,
} from '../definitions';
import { ConfigCodecService } from './config-codec.service';

export interface EffectiveSystemConfig {
  orgId: string;
  module: SystemConfigModuleName;
  value: SystemConfigValues;
  configured: boolean;
  source: ConfigSource;
  updatedAt: Date | null;
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

  /**
   * 运行时安全检查：防止恶意传入未知的 module 字符串导致空指针或配置泄漏
   */
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

  /**
   * 核心逻辑：获取当前模块的“最终生效”配置
   * 合并策略：数据库配置 (最高优) > 环境变量 (中优) > 代码默认值 (兜底)
   */
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
    const environmentValues = readEnvironment(entry);
    const value = {
      ...this.codec.defaults(entry),
      ...environmentValues,
      ...decryptedDatabaseValue,
    };
    const source: ConfigSource = stored ? 'database' : 'default';

    const configured = this.codec.isConfigured(entry, value);

    return {
      orgId,
      module: moduleName,
      value,
      configured,
      source,
      updatedAt: stored?.updatedAt ?? null,
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
        };
      }),
    );
  }

  async getConfig(orgId: string, module: string): Promise<PublicSystemConfig> {
    const effective = await this.getEffectiveConfig(orgId, module);
    const entry = SystemConfigRegistry[effective.module];
    return { ...effective, value: this.codec.mask(entry, effective.value) };
  }

  /**
   * 生成草稿配置（不入库）
   * 场景：用户在后台填写了表单，点击“测试连接”，需要用这份未保存的数据和环境变量混合后进行测试
   */
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

  /**
   * 更新或保存配置
   * 1. 验证格式 -> 2. 差异对比 -> 3. 密码加密入库 -> 4. 触发更新事件及重启检测
   */
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
    
    const restartRequiredOn = entry.restartRequiredOn ?? [];
    const restartRequired = restartRequiredOn.some(
      (field) => before.value[field] !== after.value[field]
    );

    this.eventEmitter.emit(`config.${moduleName}.updated`, {
      orgId,
      value: after.value,
    } satisfies SystemConfigChangeEvent);
    this.logger.log(`${entry.description} updated by admin.`);

    return {
      orgId,
      success: true,
      message: restartRequired
        ? '配置已保存；部分关键配置项变更，需重启 API 后生效'
        : '配置已保存并生效',
      restartRequired,
    };
  }

  /**
   * 删除数据库中的配置，退回到使用“环境变量”或“默认值”的状态
   */
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
    
    const entry = SystemConfigRegistry[moduleName];
    const restartRequiredOn = entry.restartRequiredOn ?? [];
    const restartRequired = restartRequiredOn.length > 0;

    this.eventEmitter.emit(`config.${moduleName}.deleted`, {
      orgId,
      value: fallback.value,
    } satisfies SystemConfigChangeEvent);
    this.logger.log(`${entry.description} deleted by admin.`);

    return {
      orgId,
      success: true,
      message: restartRequired
        ? '配置已删除；需重启 API 彻底卸载相关长连接'
        : '配置已删除，服务已变为未配置',
      restartRequired,
    };
  }

  /**
   * 使用 class-validator 和 DTO 进行严格的运行时格式验证
   */
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
