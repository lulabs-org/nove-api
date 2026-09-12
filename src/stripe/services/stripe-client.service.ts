import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import Stripe from 'stripe';
import {
  IntegrationChangeEvent,
  INTEGRATION_EVENT_PATTERNS,
  IntegrationsService,
} from '@/admin/integrations';
import { SingleOrgContextService } from '@/admin/org';
import { Currency } from '@prisma/client';
import { mapCurrency } from '../utils/stripe-mapping.util';

@Injectable()
export class StripeClientService implements OnModuleInit {
  private readonly logger = new Logger(StripeClientService.name);
  private stripeClient: Stripe | null = null;
  private secretKey: string = '';
  private webhookSecret: string = '';
  private publishableKey: string = '';
  private defaultCurrency: Currency = Currency.USD;

  constructor(
    private readonly integrationsService: IntegrationsService,
    private readonly orgContext: SingleOrgContextService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.reloadConfig();
  }

  @OnEvent(INTEGRATION_EVENT_PATTERNS.STRIPE_UPDATED)
  async handleConfigUpdate(event: IntegrationChangeEvent) {
    if (!this.orgContext.matches(event.orgId)) return;
    this.logger.log('Received config.stripe.updated event, reloading Stripe client...');
    await this.reloadConfig();
  }

  @OnEvent(INTEGRATION_EVENT_PATTERNS.STRIPE_DELETED)
  async handleConfigDelete(event: IntegrationChangeEvent) {
    if (!this.orgContext.matches(event.orgId)) return;
    this.logger.log('Received config.stripe.deleted event, resetting Stripe client...');
    await this.reloadConfig();
  }

  /**
   * 优先从数据库 Integrations 读取配置，回退从环境变量读取
   */
  async reloadConfig() {
    try {
      const orgId = this.orgContext.getOrgId();
      const { value } = await this.integrationsService.getEffectiveConfig(
        orgId,
        'stripe',
      );

      this.secretKey = String(
        value.secretKey ?? this.configService.get('STRIPE_SECRET_KEY') ?? '',
      ).trim();
      this.webhookSecret = String(
        value.webhookSecret ??
          this.configService.get('STRIPE_WEBHOOK_SECRET') ??
          '',
      ).trim();
      this.publishableKey = String(
        value.publishableKey ??
          this.configService.get('STRIPE_PUBLISHABLE_KEY') ??
          '',
      ).trim();
      this.defaultCurrency = mapCurrency(
        String(
          value.currency ?? this.configService.get('STRIPE_CURRENCY') ?? 'USD',
        ),
      );

      if (this.secretKey) {
        this.stripeClient = new Stripe(this.secretKey, {
          timeout: 15000,
        });
        this.logger.log('Stripe client initialized successfully.');
      } else {
        this.stripeClient = null;
        this.logger.warn(
          'Stripe secret key is not configured. Stripe operations will be unavailable.',
        );
      }
    } catch (error) {
      this.logger.error('Failed to reload Stripe configuration', error);
    }
  }

  /**
   * 获取初始化的 Stripe SDK 客户端
   */
  getClient(): Stripe {
    if (!this.stripeClient) {
      // 尝试使用环境变量应急重试
      const envKey = this.configService.get<string>('STRIPE_SECRET_KEY');
      if (envKey) {
        this.secretKey = envKey.trim();
        this.stripeClient = new Stripe(this.secretKey, { timeout: 15000 });
        return this.stripeClient;
      }
      throw new ServiceUnavailableException(
        'Stripe service is not configured. Please configure Stripe Secret Key in Integrations.',
      );
    }
    return this.stripeClient;
  }

  getWebhookSecret(): string {
    return (
      this.webhookSecret ||
      this.configService.get<string>('STRIPE_WEBHOOK_SECRET') ||
      ''
    );
  }

  getPublishableKey(): string {
    return this.publishableKey;
  }

  getDefaultCurrency(): Currency {
    return this.defaultCurrency;
  }

  /**
   * 校验 Webhook 签名并反序列化 Event 对象
   */
  constructEvent(
    rawBody: Buffer,
    signature: string | string[],
  ): Stripe.Event {
    const client = this.getClient();
    const secret = this.getWebhookSecret();

    if (!secret) {
      throw new BadRequestException('Stripe Webhook Secret is not configured');
    }

    try {
      return client.webhooks.constructEvent(rawBody, signature, secret);
    } catch (err: any) {
      this.logger.error(`Stripe webhook signature verification failed: ${err.message}`);
      throw new BadRequestException(`Webhook signature verification failed: ${err.message}`);
    }
  }
}
