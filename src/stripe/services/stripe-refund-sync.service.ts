import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { RefundChannel, RefundStatus } from '@prisma/client';
import Stripe from 'stripe';
import { StripeClientService } from './stripe-client.service';
import { StripeRepository } from '../repositories/stripe.repository';
import { StripeRefundHistorySyncDto } from '../dto';
import { mapRefundStatus } from '../utils/stripe-mapping.util';

@Injectable()
export class StripeRefundSyncService {
  private readonly logger = new Logger(StripeRefundSyncService.name);

  constructor(
    private readonly stripeClient: StripeClientService,
    private readonly stripeRepository: StripeRepository,
    @InjectQueue('stripe-sync') private readonly syncQueue: Queue,
  ) {}

  /**
   * 从 Stripe 退款对象同步本地 OrderRefund
   */
  async syncFromRefund(refund: Stripe.Refund) {
    const afterSaleCode = refund.id;
    const chargeId =
      typeof refund.charge === 'string' ? refund.charge : refund.charge?.id;
    const paymentIntentId =
      typeof refund.payment_intent === 'string'
        ? refund.payment_intent
        : refund.payment_intent?.id;

    // 关联本地订单
    const order = await this.stripeRepository.findOrderByChargeOrIntent(
      chargeId,
      paymentIntentId,
    );

    const status = mapRefundStatus(refund.status);
    const isSettled = status === RefundStatus.SETTLED;
    const submittedAt = new Date(refund.created * 1000);
    const settledAt = isSettled ? new Date(refund.created * 1000) : null;

    const refundReason =
      refund.reason || refund.description || 'Stripe 原路退款';

    const refundData = {
      afterSaleCode,
      orderId: order?.id ?? null,
      refundChannel: RefundChannel.STRIPE,
      refundAmount: refund.amount,
      refundReason,
      status,
      submittedAt,
      refundedAt: settledAt,
      financialSettledAt: settledAt,
      financialNote: `Stripe Refund ID: ${refund.id}, Charge: ${chargeId || '-'}`,
    };

    return this.stripeRepository.upsertRefund({
      afterSaleCode,
      create: refundData,
      update: refundData,
    });
  }

  /**
   * 单笔同步指定的 Stripe 退款单
   */
  async syncSingle(refundId: string) {
    const trimmedId = refundId.trim();
    if (!trimmedId.startsWith('re_')) {
      throw new BadRequestException(`Invalid Stripe refund ID format: ${trimmedId} (expected re_xxx)`);
    }

    const client = this.stripeClient.getClient();
    const refund = await client.refunds.retrieve(trimmedId);
    if (!refund) {
      throw new NotFoundException(`Stripe refund not found: ${trimmedId}`);
    }

    return this.syncFromRefund(refund);
  }

  /**
   * 下发批量历史退款同步任务至 BullMQ 队列
   */
  async syncHistory(dto: StripeRefundHistorySyncDto) {
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

    const job = await this.syncQueue.add('sync-refunds-page', {
      created: Object.keys(createdFilter).length > 0 ? createdFilter : undefined,
      limit: dto.limit || 100,
    });

    return {
      enqueued: true,
      jobId: job.id,
      message: 'Stripe 历史退款同步任务已派发至后台队列',
    };
  }

  /**
   * 处理单页 Refunds 拉取，若存在下一页游标则继续入队
   */
  async processRefundsPage(data: {
    created?: { gte?: number; lte?: number };
    startingAfter?: string;
    limit?: number;
  }) {
    const client = this.stripeClient.getClient();
    const params: Stripe.RefundListParams = {
      limit: data.limit || 100,
      starting_after: data.startingAfter,
    };

    if (data.created) {
      params.created = data.created;
    }

    const list = await client.refunds.list(params);
    this.logger.log(`Fetched ${list.data.length} refunds (has_more: ${list.has_more})`);

    let syncedCount = 0;
    for (const refund of list.data) {
      try {
        await this.syncFromRefund(refund);
        syncedCount++;
      } catch (err) {
        this.logger.error(`Error syncing refund ${refund.id}:`, err);
      }
    }

    if (list.has_more && list.data.length > 0) {
      const lastItem = list.data[list.data.length - 1];
      await this.syncQueue.add('sync-refunds-page', {
        created: data.created,
        startingAfter: lastItem.id,
        limit: data.limit || 100,
      });
    }

    return { syncedCount, hasMore: list.has_more };
  }
}
