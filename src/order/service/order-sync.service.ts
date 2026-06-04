import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import {
  OrderSyncJob,
  OrderSyncMode,
  OrderSyncStatus,
  OrderSyncTimeType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { WechatOrderHistorySyncDto } from '../dto/wechat-order-history-sync.dto';
import { WechatOrderIncrementalSyncDto } from '../dto/wechat-order-incremental-sync.dto';
import {
  DEFAULT_WECHAT_ORDER_PAGE_SIZE,
  splitWechatOrderRanges,
  toUnixSeconds,
  unixSecondsToDate,
} from '../utils/wechat-order-sync.util';
import { OrderService } from './order.service';

export const ORDER_SYNC_QUEUE = 'order-sync';
export const WECHAT_ORDER_SYNC_JOB_NAME = 'wechat-order-sync';

interface FailedOrder {
  orderId: string;
  reason: string;
}

@Injectable()
export class OrderSyncService implements OnModuleInit {
  private readonly logger = new Logger(OrderSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orderService: OrderService,
    @InjectQueue(ORDER_SYNC_QUEUE) private readonly queue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.requeueInterruptedJobs();
  }

  async enqueueWechatHistorySync(payload: WechatOrderHistorySyncDto) {
    const startTime = toUnixSeconds(payload.startTime, 'startTime');
    const endTime = toUnixSeconds(payload.endTime, 'endTime');
    this.assertTimeRange(startTime, endTime);

    const syncJob = await this.prisma.orderSyncJob.create({
      data: {
        mode: OrderSyncMode.HISTORY,
        timeType: this.toSyncTimeType(payload.timeType ?? 'create'),
        startTime: unixSecondsToDate(startTime),
        endTime: unixSecondsToDate(endTime),
        pageSize: payload.pageSize ?? DEFAULT_WECHAT_ORDER_PAGE_SIZE,
        wxStatus: payload.status,
        dryRun: payload.dryRun ?? false,
      },
    });

    return this.enqueueExistingJob(syncJob);
  }

  async enqueueWechatIncrementalSync(payload: WechatOrderIncrementalSyncDto) {
    const lookbackHours = payload.lookbackHours ?? 2;
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - lookbackHours * 3600_000);

    const syncJob = await this.prisma.orderSyncJob.create({
      data: {
        mode: OrderSyncMode.INCREMENTAL,
        timeType: OrderSyncTimeType.UPDATE,
        startTime,
        endTime,
        pageSize: payload.pageSize ?? DEFAULT_WECHAT_ORDER_PAGE_SIZE,
        dryRun: payload.dryRun ?? false,
      },
    });

    return this.enqueueExistingJob(syncJob);
  }

  async resumeWechatSyncJob(id: string) {
    const syncJob = await this.prisma.orderSyncJob.findUnique({
      where: { id },
    });
    if (!syncJob) {
      throw new BadRequestException('Order sync job not found');
    }
    if (syncJob.status === OrderSyncStatus.COMPLETED) {
      throw new BadRequestException('Completed order sync job cannot resume');
    }

    const updated = await this.prisma.orderSyncJob.update({
      where: { id },
      data: { status: OrderSyncStatus.PENDING, lastError: null },
    });

    return this.enqueueExistingJob(updated);
  }

  async getWechatSyncJob(id: string): Promise<OrderSyncJob> {
    const syncJob = await this.prisma.orderSyncJob.findUnique({
      where: { id },
    });
    if (!syncJob) {
      throw new BadRequestException('Order sync job not found');
    }

    return syncJob;
  }

  async processWechatSyncJob(id: string): Promise<OrderSyncJob> {
    let syncJob = await this.getWechatSyncJob(id);
    if (syncJob.status === OrderSyncStatus.COMPLETED) return syncJob;
    if (syncJob.status === OrderSyncStatus.PAUSED) return syncJob;

    syncJob = await this.prisma.orderSyncJob.update({
      where: { id },
      data: {
        status: OrderSyncStatus.RUNNING,
        startedAt: syncJob.startedAt ?? new Date(),
        lastError: null,
      },
    });

    try {
      await this.processRanges(syncJob);

      return this.prisma.orderSyncJob.update({
        where: { id },
        data: {
          status: OrderSyncStatus.COMPLETED,
          currentStart: syncJob.endTime,
          currentEnd: syncJob.endTime,
          nextKey: null,
          completedAt: new Date(),
          lastError: null,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown order sync error';

      await this.prisma.orderSyncJob.update({
        where: { id },
        data: {
          status: OrderSyncStatus.FAILED,
          lastError: message,
        },
      });

      throw error;
    }
  }

  private async processRanges(initialJob: OrderSyncJob): Promise<void> {
    const endTime = toUnixSeconds(initialJob.endTime, 'endTime');
    let cursor = toUnixSeconds(
      initialJob.currentStart ?? initialJob.startTime,
      'currentStart',
    );
    let currentEnd = initialJob.currentEnd
      ? toUnixSeconds(initialJob.currentEnd, 'currentEnd')
      : null;
    let nextKey = initialJob.nextKey ?? '';

    while (cursor < endTime) {
      const rangeEnd =
        currentEnd ?? splitWechatOrderRanges(cursor, endTime)[0]?.endTime;
      if (!rangeEnd) break;

      await this.prisma.orderSyncJob.update({
        where: { id: initialJob.id },
        data: {
          currentStart: unixSecondsToDate(cursor),
          currentEnd: unixSecondsToDate(rangeEnd),
          nextKey: nextKey || null,
        },
      });

      const page = await this.orderService.syncWechatOrderPage({
        startTime: cursor,
        endTime: rangeEnd,
        timeType: this.toClientTimeType(initialJob.timeType),
        pageSize: initialJob.pageSize,
        nextKey,
        status: initialJob.wxStatus,
        dryRun: initialJob.dryRun,
      });

      await this.persistPageResult(initialJob.id, page);

      if (page.hasMore) {
        nextKey = page.nextKey;
        await this.prisma.orderSyncJob.update({
          where: { id: initialJob.id },
          data: { nextKey },
        });
        continue;
      }

      cursor = rangeEnd;
      currentEnd = null;
      nextKey = '';
      await this.prisma.orderSyncJob.update({
        where: { id: initialJob.id },
        data: {
          currentStart: unixSecondsToDate(cursor),
          currentEnd: null,
          nextKey: null,
        },
      });
    }
  }

  private async persistPageResult(
    id: string,
    page: {
      fetched: number;
      created: number;
      updated: number;
      failed: FailedOrder[];
    },
  ): Promise<void> {
    const existing = await this.prisma.orderSyncJob.findUnique({
      where: { id },
      select: { failed: true },
    });
    const failed = this.mergeFailedOrders(existing?.failed, page.failed);

    await this.prisma.orderSyncJob.update({
      where: { id },
      data: {
        fetched: { increment: page.fetched },
        created: { increment: page.created },
        updated: { increment: page.updated },
        failedCount: { increment: page.failed.length },
        failed: failed.map((item) => ({
          orderId: item.orderId,
          reason: item.reason,
        })) as unknown as Prisma.InputJsonValue,
      },
    });
  }

  private mergeFailedOrders(
    existing: Prisma.JsonValue | null | undefined,
    next: FailedOrder[],
  ): FailedOrder[] {
    const current = Array.isArray(existing)
      ? (existing as unknown[]).filter(this.isFailedOrder)
      : [];

    return [...current, ...next];
  }

  private isFailedOrder(item: unknown): item is FailedOrder {
    return Boolean(
      item &&
        typeof item === 'object' &&
        'orderId' in item &&
        'reason' in item &&
        typeof item.orderId === 'string' &&
        typeof item.reason === 'string',
    );
  }

  private async enqueueExistingJob(syncJob: OrderSyncJob) {
    const job = await this.queue.add(
      WECHAT_ORDER_SYNC_JOB_NAME,
      { orderSyncJobId: syncJob.id },
      {
        jobId: syncJob.id,
        attempts: 3,
        backoff: { type: 'exponential', delay: 30_000 },
        removeOnComplete: { age: 3600, count: 1000 },
        removeOnFail: { age: 24 * 3600, count: 1000 },
      },
    );

    return this.prisma.orderSyncJob.update({
      where: { id: syncJob.id },
      data: {
        bullJobId: job.id ? String(job.id) : null,
        status: OrderSyncStatus.PENDING,
      },
    });
  }

  private async requeueInterruptedJobs(): Promise<void> {
    const jobs = await this.prisma.orderSyncJob.findMany({
      where: {
        status: { in: [OrderSyncStatus.PENDING, OrderSyncStatus.RUNNING] },
      },
      take: 100,
      orderBy: { createdAt: 'asc' },
    });

    for (const job of jobs) {
      await this.enqueueExistingJob(job).catch((error: unknown) => {
        this.logger.warn(
          `Failed to requeue order sync job ${job.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      });
    }
  }

  private assertTimeRange(startTime: number, endTime: number): void {
    if (startTime >= endTime) {
      throw new BadRequestException('startTime must be earlier than endTime');
    }
  }

  private toSyncTimeType(timeType: 'create' | 'update'): OrderSyncTimeType {
    return timeType === 'update'
      ? OrderSyncTimeType.UPDATE
      : OrderSyncTimeType.CREATE;
  }

  private toClientTimeType(timeType: OrderSyncTimeType): 'create' | 'update' {
    return timeType === OrderSyncTimeType.UPDATE ? 'update' : 'create';
  }
}
