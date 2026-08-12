import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Job } from 'bullmq';
import { PrismaService } from '@/prisma/prisma.service';
import { ITaskHandler } from './task-handler.interface';
import { TaskHandlerRegistry } from './task-handler.registry';

const DEFAULT_BATCH_SIZE = 500;
const MAX_BATCH_SIZE = 2000;

interface LinkOrdersToUsersPayload {
  batchSize?: number;
}

interface NormalizedContact {
  countryCode: string;
  phone: string;
}

@Injectable()
export class LinkOrdersToUsersByPhoneHandler
  implements ITaskHandler, OnModuleInit
{
  private readonly logger = new Logger(LinkOrdersToUsersByPhoneHandler.name);
  readonly name = 'link_orders_to_users_by_phone';

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: TaskHandlerRegistry,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async handle(job: Job): Promise<unknown> {
    const { batchSize } = this.parsePayload(job.data);
    let lastProcessedId: string | undefined;
    let candidates = 0;
    let linked = 0;
    let usersCreated = 0;
    let invalidContacts = 0;
    let deletedUserConflicts = 0;
    let skipped = 0;
    let batches = 0;
    const userIdByContact = new Map<string, string>();

    this.logger.log(
      `[${this.name}] Starting job ${job.id ?? 'unknown'} with batchSize=${batchSize}.`,
    );

    while (true) {
      const orders = await this.prisma.order.findMany({
        where: {
          purchaserId: null,
          deletedAt: null,
          ...(lastProcessedId ? { id: { gt: lastProcessedId } } : {}),
        },
        select: {
          id: true,
          phoneCode: true,
          phone: true,
        },
        orderBy: { id: 'asc' },
        take: batchSize,
      });

      if (orders.length === 0) break;

      batches++;
      candidates += orders.length;
      lastProcessedId = orders.at(-1)!.id;

      for (const order of orders) {
        const contact = this.normalizeContact(order.phoneCode, order.phone);
        if (!contact) {
          invalidContacts++;
          continue;
        }

        const contactKey = this.contactKey(contact);
        let userId = userIdByContact.get(contactKey);

        if (!userId) {
          const resolution = await this.resolveUser(contact);
          if (resolution.status === 'deleted-conflict') {
            deletedUserConflicts++;
            continue;
          }
          userId = resolution.userId;
          userIdByContact.set(contactKey, userId);
          if (resolution.created) usersCreated++;
        }

        const result = await this.prisma.order.updateMany({
          where: {
            id: order.id,
            purchaserId: null,
            deletedAt: null,
          },
          data: { purchaserId: userId },
        });

        linked += result.count;
        skipped += 1 - result.count;
      }
    }

    this.logger.log(
      `[${this.name}] Finished: candidates=${candidates}, linked=${linked}, usersCreated=${usersCreated}, invalidContacts=${invalidContacts}, deletedUserConflicts=${deletedUserConflicts}, skipped=${skipped}.`,
    );

    return {
      success: true,
      candidates,
      linked,
      usersCreated,
      invalidContacts,
      deletedUserConflicts,
      skipped,
      batches,
    };
  }

  private async resolveUser(
    contact: NormalizedContact,
  ): Promise<
    | { status: 'resolved'; userId: string; created: boolean }
    | { status: 'deleted-conflict' }
  > {
    const where = {
      uq_users_country_code_phone: contact,
    } as const;
    const existing = await this.prisma.user.findUnique({ where });

    if (existing) {
      return existing.deletedAt
        ? { status: 'deleted-conflict' }
        : { status: 'resolved', userId: existing.id, created: false };
    }

    try {
      const created = await this.prisma.user.create({
        data: {
          countryCode: contact.countryCode,
          phone: contact.phone,
          phoneVerifiedAt: null,
        },
        select: { id: true },
      });
      return { status: 'resolved', userId: created.id, created: true };
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2002'
      ) {
        throw error;
      }

      const concurrentUser = await this.prisma.user.findUnique({ where });
      if (!concurrentUser) throw error;
      return concurrentUser.deletedAt
        ? { status: 'deleted-conflict' }
        : { status: 'resolved', userId: concurrentUser.id, created: false };
    }
  }

  private normalizeContact(
    countryCode?: string | null,
    phone?: string | null,
  ): NormalizedContact | undefined {
    const countryDigits = countryCode?.replace(/\D/g, '');
    const phoneDigits = phone?.replace(/\D/g, '');
    if (!countryDigits || !phoneDigits || phoneDigits.length > 20) {
      return undefined;
    }
    return { countryCode: `+${countryDigits}`, phone: phoneDigits };
  }

  private contactKey(contact: NormalizedContact): string {
    return `${contact.countryCode}:${contact.phone}`;
  }

  private parsePayload(data: unknown): Required<LinkOrdersToUsersPayload> {
    const payload =
      data && typeof data === 'object'
        ? (data as Record<string, unknown>)
        : ({} as Record<string, unknown>);
    const batchSize = payload.batchSize ?? DEFAULT_BATCH_SIZE;

    if (
      typeof batchSize !== 'number' ||
      !Number.isInteger(batchSize) ||
      batchSize < 1 ||
      batchSize > MAX_BATCH_SIZE
    ) {
      throw new Error(
        `batchSize must be an integer between 1 and ${MAX_BATCH_SIZE}`,
      );
    }

    return { batchSize };
  }
}
