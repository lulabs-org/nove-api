import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { encrypt } from '@/common/utils/crypto.util';
import { SystemConfigRegistry } from './system-config.registry';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class SystemConfigService {
  private readonly logger = new Logger(SystemConfigService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private getModuleKey(module: string): string {
    return `${module.toUpperCase()}_CONFIG`;
  }

  async getRawConfig(module: string) {
    const key = this.getModuleKey(module);
    return this.prisma.systemConfig.findUnique({
      where: { key },
    });
  }

  async getConfig(module: string) {
    const entry = SystemConfigRegistry[module];
    if (!entry) {
      throw new NotFoundException(
        `Module configuration for '${module}' not found in registry`,
      );
    }

    const key = this.getModuleKey(module);
    const config = await this.prisma.systemConfig.findUnique({
      where: { key },
    });

    if (!config || !config.value) {
      return null;
    }

    const value = config.value as Record<string, unknown>;

    // Mask secret fields
    for (const field of entry.secretFields) {
      if (value[field]) {
        value[field] = '********';
      }
    }

    return value;
  }

  async updateConfig(module: string, data: Record<string, unknown>) {
    const entry = SystemConfigRegistry[module];
    if (!entry) {
      throw new NotFoundException(
        `Module configuration for '${module}' not found in registry`,
      );
    }

    // Transform and validate data dynamically
    const dtoInstance = plainToInstance(entry.dto, data) as object;
    const errors = await validate(dtoInstance);

    if (errors.length > 0) {
      const messages = errors
        .map((e) => Object.values(e.constraints || {}).join(', '))
        .join('; ');
      throw new BadRequestException(`Validation failed: ${messages}`);
    }

    const key = this.getModuleKey(module);
    let currentConfig: Record<string, unknown> = {};
    const existing = await this.prisma.systemConfig.findUnique({
      where: { key },
    });

    if (existing && existing.value) {
      currentConfig = existing.value as Record<string, unknown>;
    }

    const newConfig = { ...currentConfig, ...data };

    // Encrypt secrets if provided
    for (const field of entry.secretFields) {
      if (data[field] && data[field] !== '********') {
        newConfig[field] = encrypt(data[field] as string);
      } else if (data[field] === '********') {
        newConfig[field] = currentConfig[field];
      }
    }

    await this.prisma.systemConfig.upsert({
      where: { key },
      update: {
        value: newConfig as Prisma.InputJsonValue,
        isEncrypted: entry.secretFields.length > 0,
      },
      create: {
        key,
        value: newConfig as Prisma.InputJsonValue,
        isEncrypted: entry.secretFields.length > 0,
        description: entry.description,
      },
    });

    this.logger.log(`${entry.description} updated by admin.`);

    // Emit event for hot reload
    this.eventEmitter.emit(`config.${module}.updated`);

    return { success: true, message: 'Configuration saved successfully' };
  }
}
