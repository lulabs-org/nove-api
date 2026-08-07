import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { emailConfig } from '@/configs';
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
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private transporter?: nodemailer.Transporter<SMTPTransport.SentMessageInfo>;

  constructor(
    @Inject(emailConfig.KEY)
    private config: ConfigType<typeof emailConfig>,
  ) {
    this.createTransporter();
  }

  private createTransporter() {
    const { user: smtpUser, pass: smtpPass } = this.config.smtp;

    if (!smtpUser || !smtpPass) {
      this.logger.warn(
        '邮件服务配置缺失（SMTP_USER 或 SMTP_PASS），邮件功能将不可用',
      );
      return;
    }

    const transporterConfig = {
      host: this.config.smtp.host,
      port: this.config.smtp.port,
      secure: this.config.smtp.secure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    };

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

    const defaultFrom = options.from || this.config.smtp.from;

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
