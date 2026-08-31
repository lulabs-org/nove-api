import { Injectable } from '@nestjs/common';
import { MailService } from './mail.service';
import {
  buildContactChangeNotificationEmail,
  buildPasswordResetNotificationEmail,
  buildVerificationEmail,
  buildWelcomeEmail,
  ContactChangeEmailOptions,
  EmailBrandContext,
  EmailContent,
  VerificationEmailType,
} from '@/mail/templates';
import { EmailBrandResolverService } from './email-brand-resolver.service';

@Injectable()
export class AuthMailService {
  constructor(
    private readonly mailService: MailService,
    private readonly brandResolver: EmailBrandResolverService,
  ) {}

  async sendVerificationCode(
    email: string,
    code: string,
    type: VerificationEmailType,
    context?: EmailBrandContext,
  ): Promise<void> {
    const brand = await this.brandResolver.resolve(context);
    await this.send(email, buildVerificationEmail(type, code, brand));
  }

  async sendWelcomeEmail(
    email: string,
    username: string,
    context?: EmailBrandContext,
  ): Promise<void> {
    const brand = await this.brandResolver.resolve(context);
    await this.send(email, buildWelcomeEmail(username, brand));
  }

  async sendPasswordResetNotification(
    email: string,
    username: string,
    resetAt: Date = new Date(),
    context?: EmailBrandContext,
  ): Promise<void> {
    const brand = await this.brandResolver.resolve(context);
    await this.send(
      email,
      buildPasswordResetNotificationEmail(username, brand, resetAt),
    );
  }

  async sendContactChangeNotification(
    email: string,
    options: ContactChangeEmailOptions,
    context?: EmailBrandContext,
  ): Promise<void> {
    const brand = await this.brandResolver.resolve(context);
    await this.send(email, buildContactChangeNotificationEmail(options, brand));
  }

  private async send(email: string, content: EmailContent): Promise<void> {
    await this.mailService.sendSimpleEmail(
      { to: email, ...content },
      { maskTargetInLogs: true },
    );
  }
}
