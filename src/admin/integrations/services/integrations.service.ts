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
import { IntegrationsRepository } from '../repositories/integrations.repository';
import { getDefaultValues, IntegrationValues } from '../core';
import {
  ConfigSource,
  isIntegrationModule,
  INTEGRATION_MODULES,
  IntegrationModuleName,
  IntegrationRegistry,
} from '../definitions';
import {
  containsEncryptedValues,
  decodeConfig,
  encodeUpdateConfig,
  isConfigured,
  maskConfig,
  mergeDraftConfig,
  missingRequiredFields,
} from './codec.util';

export interface EffectiveIntegration {
  orgId: string;
  module: IntegrationModuleName;
  value: IntegrationValues;
  configured: boolean;
  source: ConfigSource;
  updatedAt: Date | null;
}

export interface IntegrationChangeEvent {
  orgId: string;
  value: IntegrationValues;
}

export interface PublicIntegration extends EffectiveIntegration {
  value: IntegrationValues;
}

@Injectable()
export class IntegrationsService {
  private readonly logger = new Logger(IntegrationsService.name);

  constructor(
    private readonly repository: IntegrationsRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private getModuleKey(module: IntegrationModuleName): string {
    return `${module.toUpperCase()}_CONFIG`;
  }

  /**
   * 运行时安全检查：防止恶意传入未知的 module 字符串导致空指针或配置泄漏
   */
  private assertModule(module: string): IntegrationModuleName {
    if (!isIntegrationModule(module)) {
      throw new NotFoundException(
        `Module configuration for '${module}' not found in registry`,
      );
    }
    return module;
  }

  async getRawConfig(orgId: string, module: string) {
    const moduleName = this.assertModule(module);
    return this.repository.findByKey(
      orgId,
      this.getModuleKey(moduleName),
    );
  }

  /**
   * 核心逻辑：获取当前模块的“最终生效”配置
   * 合并策略：数据库配置 (最高优) > 代码默认值 (兜底)
   */
  async getEffectiveConfig(
    orgId: string,
    module: string,
  ): Promise<EffectiveIntegration> {
    const moduleName = this.assertModule(module);
    const entry = IntegrationRegistry[moduleName];
    const stored = await this.repository.findByKey(
      orgId,
      this.getModuleKey(moduleName),
    );
    const databaseValue = (stored?.value ?? {}) as IntegrationValues;
    const decryptedDatabaseValue = decodeConfig(
      entry,
      databaseValue,
      (field) =>
        this.logger.error(
          `Failed to decrypt ${moduleName}.${field}; database override ignored`,
        ),
    );
    const value = {
      ...getDefaultValues(entry),
      ...decryptedDatabaseValue,
    };
    const source: ConfigSource = stored ? 'database' : 'default';

    const configured = isConfigured(entry, value);

    return {
      orgId,
      module: moduleName,
      value,
      configured,
      source,
      updatedAt: stored?.updatedAt ?? null,
    };
  }

  async listIntegrations(orgId: string) {
    return Promise.all(
      INTEGRATION_MODULES.map(async (module) => {
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

  async getIntegration(orgId: string, module: string): Promise<PublicIntegration> {
    const effective = await this.getEffectiveConfig(orgId, module);
    const entry = IntegrationRegistry[effective.module];
    return { ...effective, value: maskConfig(entry, effective.value) };
  }

  /**
   * 生成草稿配置（不入库）
   * 场景：用户在后台填写了表单，点击“测试连接”，需要用这份未保存的数据进行测试
   */
  async resolveDraftConfig(
    orgId: string,
    module: string,
    data: Record<string, unknown>,
  ): Promise<EffectiveIntegration> {
    const current = await this.getEffectiveConfig(orgId, module);
    await this.validateData(current.module, data);
    const entry = IntegrationRegistry[current.module];
    const value = mergeDraftConfig(entry, current.value, data);
    const missing = missingRequiredFields(entry, value);
    if (missing.length > 0) {
      throw new BadRequestException(
        `Missing required configuration: ${missing.join(', ')}`,
      );
    }

    return { ...current, value };
  }

  /**
   * 更新或保存配置
   * 1. 验证格式 -> 2. 差异对比 -> 3. 密码加密入库 -> 4. 触发更新事件及重启检测
   */
  async updateIntegration(
    orgId: string,
    module: string,
    data: Record<string, unknown>,
  ) {
    const moduleName = this.assertModule(module);
    const entry = IntegrationRegistry[moduleName];
    await this.validateData(moduleName, data);

    const before = await this.getEffectiveConfig(orgId, moduleName);
    const key = this.getModuleKey(moduleName);
    const existing = await this.repository.findByKey(orgId, key);
    const currentConfig = (existing?.value ?? {}) as Record<string, unknown>;
    const newConfig = encodeUpdateConfig(entry, currentConfig, data);

    await this.repository.upsert(
      orgId,
      key,
      newConfig as Prisma.InputJsonValue,
      containsEncryptedValues(entry, newConfig),
      entry.description,
    );

    const after = await this.getEffectiveConfig(orgId, moduleName);

    const restartRequiredOn = entry.restartRequiredOn ?? [];
    const restartRequired = restartRequiredOn.some(
      (field) => before.value[field] !== after.value[field],
    );

    this.eventEmitter.emit(`config.${moduleName}.updated`, {
      orgId,
      value: after.value,
    } satisfies IntegrationChangeEvent);
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
   * 删除数据库中的配置，退回到使用“默认值”的状态
   */
  async deleteIntegration(orgId: string, module: string) {
    const moduleName = this.assertModule(module);
    const key = this.getModuleKey(moduleName);
    const existing = await this.repository.findByKey(orgId, key);

    if (!existing) {
      throw new NotFoundException(
        `Configuration for module '${moduleName}' does not exist`,
      );
    }

    await this.repository.delete(orgId, key);
    const fallback = await this.getEffectiveConfig(orgId, moduleName);

    const entry = IntegrationRegistry[moduleName];
    const restartRequiredOn = entry.restartRequiredOn ?? [];
    const restartRequired = restartRequiredOn.length > 0;

    this.eventEmitter.emit(`config.${moduleName}.deleted`, {
      orgId,
      value: fallback.value,
    } satisfies IntegrationChangeEvent);
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
    module: IntegrationModuleName,
    data: Record<string, unknown>,
  ): Promise<void> {
    const dtoInstance = plainToInstance(IntegrationRegistry[module].dto, data);
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
