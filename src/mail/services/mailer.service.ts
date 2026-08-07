import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { emailConfig } from '@/configs';
import { SystemConfigService } from '@/admin/system-config/system-config.service';
import { OnEvent } from '@nestjs/event-emitter';
import { decrypt } from '@/common/utils/crypto.util';
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
  private activeConfig: any = null;

  constructor(
    @Inject(emailConfig.KEY)
    private config: ConfigType<typeof emailConfig>,
    private readonly systemConfigService: SystemConfigService,
  ) {}

  async onModuleInit() {
    await this.reloadTransporter();
  }

  @OnEvent('config.mail.updated')
  async handleMailConfigUpdate() {
    this.logger.log('Received config.mail.updated event, reloading transporter...');
    await this.reloadTransporter();
  }

  private async reloadTransporter() {
    // 1. Try to load from database first
    const dbConfig = await this.systemConfigService.getConfig('mail');

    let smtpUser = this.config.smtp.user;
    let smtpPass = this.config.smtp.pass;
    let smtpHost = this.config.smtp.host;
    let smtpPort = this.config.smtp.port;
    let smtpSecure = this.config.smtp.secure;
    let smtpFrom = this.config.smtp.from;

    if (dbConfig) {
      smtpHost = dbConfig.host ?? smtpHost;
      smtpPort = dbConfig.port ?? smtpPort;
      smtpSecure = dbConfig.secure ?? smtpSecure;
      smtpUser = dbConfig.user ?? smtpUser;
      smtpFrom = dbConfig.from ?? smtpFrom;
      
      // dbConfig.pass returned by getMailConfig is masked.
      // We must query the raw DB value to get the encrypted password.
      // Alternatively, we can use a raw prisma call here, but let's just 
      // create a specific method in SystemConfigService or use Prisma directly.
      // Since MailerService shouldn't know about Prisma, let's fetch raw config.
    }
    
    // To keep it simple, we will fetch raw from SystemConfigService here:
    const rawConfig = await this.systemConfigService.getRawConfig('mail');
    if (rawConfig && rawConfig.value) {
      const val = rawConfig.value as any;
      if (val.pass) {
        try {
          smtpPass = decrypt(val.pass);
        } catch (e) {
          this.logger.error('Failed to decrypt SMTP password from DB');
        }
      }
    }

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

    const defaultFrom = options.from || this.activeConfig?.from || this.config.smtp.from;

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
