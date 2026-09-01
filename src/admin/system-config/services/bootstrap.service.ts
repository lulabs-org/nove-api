import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { decrypt, encrypt } from '@/common/utils/crypto.util';
import { PrismaService } from '@/prisma/prisma.service';
import {
  SYSTEM_CONFIG_ENV_IMPORT_KEY,
  SYSTEM_CONFIG_MODULES,
  SystemConfigEnvironmentImportMetadata,
  SystemConfigModuleName,
  SystemConfigRegistry,
  SystemConfigValues,
} from '../registries/system-config.registry';

const MAX_TRANSACTION_ATTEMPTS = 3;
const ENCRYPTED_VALUE_PATTERN = /^[0-9a-f]{32}:[0-9a-f]{32}:[0-9a-f]*$/i;

@Injectable()
export class BootstrapService {
  private readonly logger = new Logger(BootstrapService.name);

  constructor(private readonly prisma: PrismaService) {}

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
      ...entry.defaults,
      ...environment.values,
      ...storedValue,
    } as SystemConfigValues;
    const encryptedValue = { ...plainValue };

    for (const field of entry.secretFields) {
      const storedSecret = storedValue[field];
      if (this.hasValue(storedSecret)) {
        const normalized = this.normalizeStoredSecret(
          module,
          field,
          storedSecret,
        );
        plainValue[field] = normalized.plaintext;
        encryptedValue[field] = normalized.encrypted;
        continue;
      }

      const importedSecret = plainValue[field];
      if (typeof importedSecret === 'string' && importedSecret) {
        encryptedValue[field] = encrypt(importedSecret);
      }
    }

    const configured = entry.requiredFields.every((field) =>
      this.hasValue(plainValue[field]),
    );

    await transaction.systemConfig.upsert({
      where: { orgId_key: { orgId, key } },
      update: {
        value: encryptedValue as Prisma.InputJsonValue,
        isEncrypted: entry.secretFields.some((field) =>
          this.hasValue(encryptedValue[field]),
        ),
      },
      create: {
        orgId,
        key,
        value: encryptedValue as Prisma.InputJsonValue,
        isEncrypted: entry.secretFields.some((field) =>
          this.hasValue(encryptedValue[field]),
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
    const environment = entry.bootstrapEnvironment();
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

  private normalizeStoredSecret(
    module: SystemConfigModuleName,
    field: string,
    value: unknown,
  ): { plaintext: string; encrypted: string } {
    if (typeof value !== 'string') {
      throw new Error(`Invalid stored secret type for ${module}.${field}`);
    }
    if (!ENCRYPTED_VALUE_PATTERN.test(value)) {
      return { plaintext: value, encrypted: encrypt(value) };
    }

    try {
      return { plaintext: decrypt(value), encrypted: value };
    } catch {
      throw new Error(
        `Stored encrypted secret is unreadable: ${module}.${field}`,
      );
    }
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
