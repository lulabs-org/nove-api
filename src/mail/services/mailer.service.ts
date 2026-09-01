import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SystemConfigService } from '@/admin/system-config/services/system-config.service';
import { OnEvent } from '@nestjs/event-emitter';
import * as nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

export interface MailerSendOptions {
  to: string;
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

@Injectable()
export class MailerService implements OnModuleInit {
  private readonly logger = new Logger(MailerService.name);
  private transporter?: nodemailer.Transporter<SMTPTransport.SentMessageInfo>;
  private activeConfig: Record<string, string> | null = null;

  constructor(private readonly systemConfigService: SystemConfigService) {}

  async onModuleInit() {
    await this.reloadTransporter();
  }

  @OnEvent('config.mail.updated')
  async handleMailConfigUpdate() {
    this.logger.log(
      'Received config.mail.updated event, reloading transporter...',
    );
    await this.reloadTransporter();
  }

  @OnEvent('config.mail.deleted')
  async handleMailConfigDelete() {
    await this.reloadTransporter();
  }

  private async reloadTransporter() {
    const { value } = await this.systemConfigService.getEffectiveConfig('mail');
    const smtpUser = String(value.user ?? '');
    const smtpPass = String(value.pass ?? '');
    const smtpHost = String(value.host ?? '');
    const smtpPort = Number(value.port ?? 587);
    const smtpSecure = Boolean(value.secure ?? false);
    const smtpFrom = String(value.from ?? '');

    this.activeConfig = {
      from: smtpFrom,
    };

    if (!smtpUser || !smtpPass) {
      this.logger.warn(
        '邮件服务配置缺失（SMTP_USER 或 SMTP_PASS），邮件功能将不可用',
      );
      this.transporter = undefined;
      return;
    }

    const transporterConfig = {
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    };

    // close existing transporter if any
    if (this.transporter) {
      this.transporter.close();
    }

    this.transporter = nodemailer.createTransport(transporterConfig);

    this.transporter.verify((error: Error | null) => {
      if (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.warn('邮件服务配置错误，邮件功能将不可用:', errorMessage);
      } else {
        this.logger.log('邮件服务已就绪');
      }
    });
  }

  async send(
    options: MailerSendOptions,
  ): Promise<{ messageId: string } | null> {
    if (!this.transporter) {
      this.logger.warn('邮件服务未配置，无法发送邮件');
      return null;
    }

    const defaultFrom = options.from || this.activeConfig?.from || '';

    const mailOptions: nodemailer.SendMailOptions = {
      from: defaultFrom,
      to: options.to,
      cc: options.cc,
      bcc: options.bcc,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    const info = await this.transporter.sendMail(mailOptions);
    return { messageId: info.messageId };
  }

  async verify(): Promise<boolean> {
    try {
      if (!this.transporter) {
        this.logger.warn('邮件服务未配置，无法验证连接');
        return false;
      }
      await this.transporter.verify();
      this.logger.log('SMTP连接验证成功');
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(`SMTP连接验证失败: ${errorMessage}`);
      return false;
    }
  }
}
