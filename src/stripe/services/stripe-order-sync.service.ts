import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { OrderStatus, PaymentProvider, Prisma } from '@prisma/client';
import Stripe from 'stripe';
import { StripeClientService } from './stripe-client.service';
import { StripeRepository } from '../repositories/stripe.repository';
import { UserQueryRepository } from '@/user/repositories/user-query.repository';
import { UserCommandRepository } from '@/user/repositories/user-command.repository';
import { StripeOrderHistorySyncDto } from '../dto';
import { mapCurrency, mapPaymentStatus } from '../utils/stripe-mapping.util';
import { encodeOrderNumber, generateOrderCode } from '../utils/order-number.util';

@Injectable()
export class StripeOrderSyncService {
  private readonly logger = new Logger(StripeOrderSyncService.name);

  constructor(
    private readonly stripeClient: StripeClientService,
    private readonly stripeRepository: StripeRepository,
    private readonly userQuery: UserQueryRepository,
    private readonly userCommand: UserCommandRepository,
    @InjectQueue('stripe-sync') private readonly syncQueue: Queue,
  ) {}

  /**
   * 优先通过 metadata.userId 或邮箱关联用户，若不存在则自动建档
   */
  private async resolvePurchaserId(
    email?: string | null,
    userId?: string | null,
    displayName?: string | null,
  ): Promise<string | undefined> {
    if (userId) {
      const user = await this.userQuery.byId(userId);
      if (user) return user.id;
    }

    if (email) {
      const normalizedEmail = email.trim().toLowerCase();
      let user = await this.userQuery.byEmail(normalizedEmail);
      if (!user) {
        const name = displayName?.trim() || normalizedEmail.split('@')[0];
        try {
          user = await this.userCommand.createWithProfile({
            email: normalizedEmail,
            profileName: name,
            password: null,
            emailVerifiedAt: new Date(),
          });
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
          ) {
            user = await this.userQuery.byEmail(normalizedEmail);
          } else {
            this.logger.warn(`Failed to auto-create user for ${normalizedEmail}:`, error);
          }
        }
      }
      if (user) return user.id;
    }

    return undefined;
  }

  /**
   * 从 Stripe Checkout Session 同步订单
   */
  async syncFromCheckoutSession(session: Stripe.Checkout.Session) {
    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id;
    const externalId = paymentIntentId || session.id;

    const email = session.customer_details?.email || session.customer_email;
    const phone = session.customer_details?.phone;
    const name = session.customer_details?.name;
    const metadata = session.metadata || {};

    const purchaserId = await this.resolvePurchaserId(
      email,
      metadata.userId,
      name,
    );

    const isPaid = session.payment_status === 'paid';
    const status = isPaid ? OrderStatus.PAID : OrderStatus.UNPAID;
    const paidAt = isPaid ? new Date(session.created * 1000) : undefined;
    const amount = session.amount_total ?? 0;
    const currency = mapCurrency(session.currency);

    const orderData = {
      status,
      paidAt,
      amount,
      currency,
      paymentProvider: PaymentProvider.STRIPE,
      providerTradeNo: paymentIntentId || session.id,
      email: email || undefined,
      phone: phone || undefined,
      purchaserId,
      externalId,
      metadata: {
        source: 'stripe_checkout_session',
        sessionId: session.id,
        paymentIntentId,
        customerId: session.customer,
        ...metadata,
      } as Prisma.InputJsonValue,
    };

    return this.stripeRepository.upsertOrder({
      externalId,
      create: () => {
        const orderCode = generateOrderCode();
        return {
          ...orderData,
          orderCode,
          orderNumber: encodeOrderNumber(orderCode),
        };
      },
      update: orderData,
    });
  }

  /**
   * 从 Stripe PaymentIntent 同步订单
   */
  async syncFromPaymentIntent(paymentIntent: Stripe.PaymentIntent) {
    const externalId = paymentIntent.id;
    const chargeId =
      typeof paymentIntent.latest_charge === 'string'
        ? paymentIntent.latest_charge
        : paymentIntent.latest_charge?.id;

    const email = paymentIntent.receipt_email;
    const metadata = paymentIntent.metadata || {};
    const purchaserId = await this.resolvePurchaserId(
      email,
      metadata.userId,
      null,
    );

    const status = mapPaymentStatus(paymentIntent.status);
    const isPaid = status === OrderStatus.PAID;
    const paidAt = isPaid ? new Date(paymentIntent.created * 1000) : undefined;
    const amount = paymentIntent.amount ?? 0;
    const currency = mapCurrency(paymentIntent.currency);

    const orderData = {
      status,
      paidAt,
      amount,
      currency,
      paymentProvider: PaymentProvider.STRIPE,
      providerTradeNo: chargeId || paymentIntent.id,
      email: email || undefined,
      purchaserId,
      externalId,
      metadata: {
        source: 'stripe_payment_intent',
        paymentIntentId: paymentIntent.id,
        chargeId,
        customerId: paymentIntent.customer,
        ...metadata,
      } as Prisma.InputJsonValue,
    };

    return this.stripeRepository.upsertOrder({
      externalId,
      create: () => {
        const orderCode = generateOrderCode();
        return {
          ...orderData,
          orderCode,
          orderNumber: encodeOrderNumber(orderCode),
        };
      },
      update: orderData,
    });
  }

  /**
   * 从 Stripe Charge 同步订单
   */
  async syncFromCharge(charge: Stripe.Charge) {
    const paymentIntentId =
      typeof charge.payment_intent === 'string'
        ? charge.payment_intent
        : charge.payment_intent?.id;

    if (paymentIntentId) {
      try {
        const client = this.stripeClient.getClient();
        const pi = await client.paymentIntents.retrieve(paymentIntentId);
        return this.syncFromPaymentIntent(pi);
      } catch (e) {
        this.logger.warn(`Failed to retrieve PaymentIntent ${paymentIntentId} for charge ${charge.id}, falling back to charge mapping`);
      }
    }

    const externalId = charge.id;
    const email = charge.billing_details?.email || charge.receipt_email;
    const phone = charge.billing_details?.phone;
    const name = charge.billing_details?.name;
    const metadata = charge.metadata || {};

    const purchaserId = await this.resolvePurchaserId(
      email,
      metadata.userId,
      name,
    );

    const isPaid = charge.paid && charge.status === 'succeeded';
    const status = isPaid ? OrderStatus.PAID : OrderStatus.UNPAID;
    const paidAt = isPaid ? new Date(charge.created * 1000) : undefined;
    const amount = charge.amount ?? 0;
    const currency = mapCurrency(charge.currency);

    const orderData = {
      status,
      paidAt,
      amount,
      currency,
      paymentProvider: PaymentProvider.STRIPE,
      providerTradeNo: charge.id,
      email: email || undefined,
      phone: phone || undefined,
      purchaserId,
      externalId,
      metadata: {
        source: 'stripe_charge',
        chargeId: charge.id,
        paymentIntentId,
        customerId: charge.customer,
        ...metadata,
      } as Prisma.InputJsonValue,
    };

    return this.stripeRepository.upsertOrder({
      externalId,
      create: () => {
        const orderCode = generateOrderCode();
        return {
          ...orderData,
          orderCode,
          orderNumber: encodeOrderNumber(orderCode),
        };
      },
      update: orderData,
    });
  }

  /**
   * 按需单笔同步指定的外部 ID（PaymentIntent, CheckoutSession 或 Charge）
   */
  async syncSingle(externalId: string) {
    const trimmedId = externalId.trim();
    const client = this.stripeClient.getClient();

    if (trimmedId.startsWith('cs_')) {
      const session = await client.checkout.sessions.retrieve(trimmedId);
      if (!session) throw new NotFoundException(`Checkout session not found: ${trimmedId}`);
      return this.syncFromCheckoutSession(session);
    }

    if (trimmedId.startsWith('pi_')) {
      const pi = await client.paymentIntents.retrieve(trimmedId);
      if (!pi) throw new NotFoundException(`PaymentIntent not found: ${trimmedId}`);
      return this.syncFromPaymentIntent(pi);
    }

    if (trimmedId.startsWith('ch_')) {
      const charge = await client.charges.retrieve(trimmedId);
      if (!charge) throw new NotFoundException(`Charge not found: ${trimmedId}`);
      return this.syncFromCharge(charge);
    }

    // 默认尝试作为 paymentIntent
    try {
      const pi = await client.paymentIntents.retrieve(trimmedId);
      return await this.syncFromPaymentIntent(pi);
    } catch {
      throw new BadRequestException(`Unrecognized Stripe identifier format: ${trimmedId}`);
    }
  }

  /**
   * 下发批量历史订单同步任务至 BullMQ 队列
   */
  async syncHistory(dto: StripeOrderHistorySyncDto) {
    const createdFilter: { gte?: number; lte?: number } = {};

    if (dto.startDate) {
      const startMs = new Date(dto.startDate).getTime();
      if (isNaN(startMs)) throw new BadRequestException('Invalid startDate format');
      createdFilter.gte = Math.floor(startMs / 1000);
    }

    if (dto.endDate) {
      const endMs = new Date(dto.endDate).getTime();
      if (isNaN(endMs)) throw new BadRequestException('Invalid endDate format');
      createdFilter.lte = Math.floor(endMs / 1000);
    }

    if (
      createdFilter.gte &&
      createdFilter.lte &&
      createdFilter.gte > createdFilter.lte
    ) {
      throw new BadRequestException('startDate must be earlier than endDate');
    }

    const job = await this.syncQueue.add('sync-payment-intents-page', {
      created: Object.keys(createdFilter).length > 0 ? createdFilter : undefined,
      limit: dto.limit || 100,
    });

    return {
      enqueued: true,
      jobId: job.id,
      message: 'Stripe 历史订单同步任务已派发至后台队列',
    };
  }

  /**
   * 处理单页 PaymentIntents 拉取，若存在下一页游标则继续入队
   */
  async processPaymentIntentsPage(data: {
    created?: { gte?: number; lte?: number };
    startingAfter?: string;
    limit?: number;
  }) {
    const client = this.stripeClient.getClient();
    const params: Stripe.PaymentIntentListParams = {
      limit: data.limit || 100,
      starting_after: data.startingAfter,
    };

    if (data.created) {
      params.created = data.created;
    }

    const list = await client.paymentIntents.list(params);
    this.logger.log(`Fetched ${list.data.length} payment intents (has_more: ${list.has_more})`);

    let syncedCount = 0;
    for (const pi of list.data) {
      try {
        if (pi.status === 'succeeded') {
          await this.syncFromPaymentIntent(pi);
          syncedCount++;
        }
      } catch (err) {
        this.logger.error(`Error syncing PaymentIntent ${pi.id}:`, err);
      }
    }

    if (list.has_more && list.data.length > 0) {
      const lastItem = list.data[list.data.length - 1];
      await this.syncQueue.add('sync-payment-intents-page', {
        created: data.created,
        startingAfter: lastItem.id,
        limit: data.limit || 100,
      });
    }

    return { syncedCount, hasMore: list.has_more };
  }
}
