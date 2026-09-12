import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { RefundChannel, RefundStatus } from '@prisma/client';
import Stripe from 'stripe';
import { StripeRefundSyncService } from './stripe-refund-sync.service';
import { StripeClientService } from './stripe-client.service';
import { StripeRepository } from '../repositories/stripe.repository';

describe('StripeRefundSyncService', () => {
  let service: StripeRefundSyncService;
  let stripeClient: Partial<StripeClientService>;
  let stripeRepository: Partial<StripeRepository>;
  let queue: { add: jest.Mock };

  beforeEach(async () => {
    stripeClient = {
      getClient: jest.fn().mockReturnValue({
        refunds: {
          retrieve: jest.fn(),
          list: jest.fn(),
        },
      }),
    };

    stripeRepository = {
      findOrderByChargeOrIntent: jest
        .fn()
        .mockResolvedValue({ id: 'order-999' }),
      upsertRefund: jest
        .fn()
        .mockImplementation(
          ({
            create,
            afterSaleCode,
          }: {
            create: Record<string, unknown>;
            afterSaleCode: string;
          }) =>
            Promise.resolve({
              id: 'refund-1',
              afterSaleCode,
              ...create,
            }),
        ),
    };

    queue = {
      add: jest.fn().mockResolvedValue({ id: 'job-refund-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeRefundSyncService,
        { provide: StripeClientService, useValue: stripeClient },
        { provide: StripeRepository, useValue: stripeRepository },
        { provide: getQueueToken('stripe-sync'), useValue: queue },
      ],
    }).compile();

    service = module.get<StripeRefundSyncService>(StripeRefundSyncService);
  });

  it('should sync refund and associate local order', async () => {
    const refund = {
      id: 're_123',
      amount: 1500,
      charge: 'ch_456',
      payment_intent: 'pi_789',
      status: 'succeeded',
      reason: 'requested_by_customer',
      created: 1700000000,
    } as unknown as Stripe.Refund;

    const result = await service.syncFromRefund(refund);

    expect(stripeRepository.findOrderByChargeOrIntent).toHaveBeenCalledWith(
      'ch_456',
      'pi_789',
    );
    expect(stripeRepository.upsertRefund).toHaveBeenCalledWith(
      expect.objectContaining({
        afterSaleCode: 're_123',
        create: expect.objectContaining({
          orderId: 'order-999',
          refundChannel: RefundChannel.STRIPE,
          refundAmount: 1500,
          status: RefundStatus.SETTLED,
        }) as unknown as Record<string, unknown>,
      }),
    );
    expect(result.afterSaleCode).toBe('re_123');
  });

  it('should dispatch history refund sync job to queue', async () => {
    const result = await service.syncHistory({
      startDate: '2026-09-01T00:00:00.000Z',
      endDate: '2026-09-10T00:00:00.000Z',
      limit: 100,
    });

    expect(result.enqueued).toBe(true);
    expect(queue.add).toHaveBeenCalledWith(
      'sync-refunds-page',
      expect.objectContaining({ limit: 100 }),
    );
  });
});
