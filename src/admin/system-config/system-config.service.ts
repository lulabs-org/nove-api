import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UpdateMailConfigDto } from './dto/mail-config.dto';
import { encrypt } from '@/common/utils/crypto.util';

export const MAIL_SMTP_CONFIG_KEY = 'MAIL_SMTP_CONFIG';

@Injectable()
export class SystemConfigService {
  private readonly logger = new Logger(SystemConfigService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getRawMailConfig() {
    return this.prisma.systemConfig.findUnique({
      where: { key: MAIL_SMTP_CONFIG_KEY },
    });
  }

  async getMailConfig() {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key: MAIL_SMTP_CONFIG_KEY },
    });

    if (!config || !config.value) {
      return null;
    }

    const value = config.value as any;
    // Do not return the real password to the frontend
    if (value.pass) {
      value.pass = '********';
    }

    return value;
  }

  async updateMailConfig(dto: UpdateMailConfigDto) {
    let currentConfig: any = {};
    const existing = await this.prisma.systemConfig.findUnique({
      where: { key: MAIL_SMTP_CONFIG_KEY },
    });

    if (existing && existing.value) {
      currentConfig = existing.value;
    }

    const newConfig = { ...currentConfig, ...dto };

    // Encrypt password if provided
    if (dto.pass && dto.pass !== '********') {
      newConfig.pass = encrypt(dto.pass);
    } else if (dto.pass === '********') {
      // Retain the existing encrypted password
      newConfig.pass = currentConfig.pass;
    }

    await this.prisma.systemConfig.upsert({
      where: { key: MAIL_SMTP_CONFIG_KEY },
      update: {
        value: newConfig,
        isEncrypted: true,
      },
      create: {
        key: MAIL_SMTP_CONFIG_KEY,
        value: newConfig,
        isEncrypted: true,
        description: 'Global SMTP Mail Configuration',
      },
    });

    this.logger.log('Mail configuration updated by admin.');

    // Emit event for hot reload
    this.eventEmitter.emit('config.mail.updated');

    return { success: true, message: 'Configuration saved successfully' };
  }
}
