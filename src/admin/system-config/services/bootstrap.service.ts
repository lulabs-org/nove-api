import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaService } from '@/prisma/prisma.service';
import {
  readBootstrapEnvironment,
  SYSTEM_CONFIG_ENV_IMPORT_KEY,
  SystemConfigEnvironmentImportMetadata,
} from '../configs';
import {
  SYSTEM_CONFIG_MODULES,
  SystemConfigModuleName,
  SystemConfigRegistry,
  SystemConfigValues,
} from '../configs';
import { ConfigCodecService } from './config-codec.service';

const MAX_TRANSACTION_ATTEMPTS = 3;

@Injectable()
export class BootstrapService {
  private readonly logger = new Logger(BootstrapService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly codec: ConfigCodecService,
  ) {}

  async run(orgId: string): Promise<void> {
    const completed = await this.prisma.systemConfig.findUnique({
      where: {
        orgId_key: { orgId, key: SYSTEM_CONFIG_ENV_IMPORT_KEY },
      },
    });
    if (completed) {
      this.logger.log(
        'Service configuration environment import already completed.',
      );
      return;
    }

    for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
      try {
        await this.importInTransaction(orgId);
        return;
      } catch (error) {
        if (!this.isRetryableTransactionError(error)) throw error;

        const marker = await this.prisma.systemConfig.findUnique({
          where: {
            orgId_key: { orgId, key: SYSTEM_CONFIG_ENV_IMPORT_KEY },
          },
        });
        if (marker) {
          this.logger.log(
            'Service configuration environment import completed by another instance.',
          );
          return;
        }
        if (attempt === MAX_TRANSACTION_ATTEMPTS) throw error;
      }
    }
  }

  private async importInTransaction(orgId: string): Promise<void> {
    await this.prisma.$transaction(
      async (transaction) => {
        const existingMarker = await transaction.systemConfig.findUnique({
          where: {
            orgId_key: { orgId, key: SYSTEM_CONFIG_ENV_IMPORT_KEY },
          },
        });
        if (existingMarker) return;

        const modules = {} as SystemConfigEnvironmentImportMetadata['modules'];

        for (const module of SYSTEM_CONFIG_MODULES) {
          modules[module] = await this.importModule(transaction, orgId, module);
        }

        const metadata: SystemConfigEnvironmentImportMetadata = {
          version: 1,
          completedAt: new Date().toISOString(),
          modules,
        };
        await transaction.systemConfig.create({
          data: {
            orgId,
            key: SYSTEM_CONFIG_ENV_IMPORT_KEY,
            value: metadata as unknown as Prisma.InputJsonValue,
            isEncrypted: false,
            description: 'One-time service environment import metadata',
          },
        });

        this.logger.log('Service configuration environment import completed.');
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private async importModule(
    transaction: Prisma.TransactionClient,
    orgId: string,
    module: SystemConfigModuleName,
  ): Promise<
    SystemConfigEnvironmentImportMetadata['modules'][SystemConfigModuleName]
  > {
    const entry = SystemConfigRegistry[module];
    const key = this.getModuleKey(module);
    const stored = await transaction.systemConfig.findUnique({
      where: { orgId_key: { orgId, key } },
    });
    const storedValue = (stored?.value ?? {}) as SystemConfigValues;
    const environment = await this.sanitizeEnvironment(module);
    const importedFields = environment.fields.filter(
      (field) => !this.hasValue(storedValue[field]),
    );
    const shouldPersist = Boolean(stored) || environment.explicitFieldCount > 0;

    if (!shouldPersist) {
      return { status: 'skipped', fields: [], configured: false };
    }

    const plainValue = {
      ...this.codec.defaults(entry),
      ...environment.values,
      ...storedValue,
    } as SystemConfigValues;
    const normalized = this.codec.normalizeBootstrap(
      module,
      entry,
      plainValue,
      storedValue,
    );
    const configured = this.codec.isConfigured(entry, normalized.plainValue);

    await transaction.systemConfig.upsert({
      where: { orgId_key: { orgId, key } },
      update: {
        value: normalized.storedValue as Prisma.InputJsonValue,
        isEncrypted: this.codec.containsEncryptedValues(
          entry,
          normalized.storedValue,
        ),
      },
      create: {
        orgId,
        key,
        value: normalized.storedValue as Prisma.InputJsonValue,
        isEncrypted: this.codec.containsEncryptedValues(
          entry,
          normalized.storedValue,
        ),
        description: entry.description,
      },
    });

    this.logger.log(
      `${module}: ${stored ? 'existing configuration preserved' : 'configuration created'}; imported fields: ${importedFields.join(', ') || 'none'}; configured: ${configured}`,
    );

    return {
      status: importedFields.length > 0 ? 'imported' : 'existing',
      fields: importedFields,
      configured,
    };
  }

  private async sanitizeEnvironment(module: SystemConfigModuleName): Promise<{
    values: SystemConfigValues;
    fields: string[];
    explicitFieldCount: number;
  }> {
    const entry = SystemConfigRegistry[module];
    const environment = readBootstrapEnvironment(entry);
    const values = { ...environment.values };
    const instance = plainToInstance(entry.dto, values);
    const errors = await validate(instance, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    const invalidFields = new Set(errors.map((error) => error.property));

    for (const field of invalidFields) {
      delete values[field];
      this.logger.warn(
        `${module}.${field}: invalid environment value ignored.`,
      );
    }

    return {
      values,
      fields: environment.fields.filter((field) => !invalidFields.has(field)),
      explicitFieldCount: environment.fields.length,
    };
  }

  private isRetryableTransactionError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === 'P2002' || error.code === 'P2034')
    );
  }

  private getModuleKey(module: SystemConfigModuleName): string {
    return `${module.toUpperCase()}_CONFIG`;
  }

  private hasValue(value: unknown): boolean {
    return value !== undefined && value !== null && value !== '';
  }
}
