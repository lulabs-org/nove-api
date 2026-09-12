import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import {
  Currency,
  OrderStatus,
  PaymentProvider,
} from '@/generated/prisma/client';
import Stripe from 'stripe';
import { StripeOrderSyncService } from './stripe-order-sync.service';
import { StripeClientService } from './stripe-client.service';
import { StripeRepository } from '../repositories/stripe.repository';
import { UserQueryRepository } from '@/user/repositories/user-query.repository';
import { UserCommandRepository } from '@/user/repositories/user-command.repository';

describe('StripeOrderSyncService', () => {
  let service: StripeOrderSyncService;
  let stripeClient: Partial<StripeClientService>;
  let stripeRepository: Partial<StripeRepository>;
  let userQuery: Partial<UserQueryRepository>;
  let userCommand: Partial<UserCommandRepository>;
  let queue: { add: jest.Mock };

  beforeEach(async () => {
    stripeClient = {
      getClient: jest.fn().mockReturnValue({
        checkout: {
          sessions: {
            retrieve: jest.fn(),
          },
        },
        paymentIntents: {
          retrieve: jest.fn(),
          list: jest.fn(),
        },
      }),
    };

    stripeRepository = {
      upsertOrder: jest
        .fn()
        .mockImplementation(
          async ({
            create,
            externalId,
          }: {
            create:
              | (() => Promise<Record<string, unknown>>)
              | Record<string, unknown>;
            externalId: string;
          }) => {
            const createData =
              typeof create === 'function' ? await create() : create;
            return {
              action: 'created',
              order: { id: 'order-1', externalId, ...createData },
            };
          },
        ),
    };

    userQuery = {
      byId: jest.fn().mockResolvedValue(null),
      byEmail: jest
        .fn()
        .mockResolvedValue({ id: 'user-123', email: 'test@example.com' }),
    };

    userCommand = {
      createWithProfile: jest
        .fn()
        .mockResolvedValue({ id: 'user-new', email: 'new@example.com' }),
    };

    queue = {
      add: jest.fn().mockResolvedValue({ id: 'job-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StripeOrderSyncService,
        { provide: StripeClientService, useValue: stripeClient },
        { provide: StripeRepository, useValue: stripeRepository },
        { provide: UserQueryRepository, useValue: userQuery },
        { provide: UserCommandRepository, useValue: userCommand },
        { provide: getQueueToken('stripe-sync'), useValue: queue },
      ],
    }).compile();

    service = module.get<StripeOrderSyncService>(StripeOrderSyncService);
  });

  it('should sync order from PaymentIntent and link user by email', async () => {
    const paymentIntent = {
      id: 'pi_test123',
      amount: 4900,
      currency: 'usd',
      status: 'succeeded',
      created: 1700000000,
      receipt_email: 'test@example.com',
      latest_charge: 'ch_test123',
      metadata: {},
    } as unknown as Stripe.PaymentIntent;

    const result = await service.syncFromPaymentIntent(paymentIntent);

    expect(result.action).toBe('created');
    expect(stripeRepository.upsertOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        externalId: 'pi_test123',
        update: expect.objectContaining({
          amount: 4900,
          currency: Currency.USD,
          status: OrderStatus.PAID,
          purchaserId: 'user-123',
          paymentProvider: PaymentProvider.STRIPE,
        }) as unknown as Record<string, unknown>,
      }),
    );
  });

  it('should sync order from CheckoutSession and map correctly', async () => {
    const session = {
      id: 'cs_test123',
      payment_intent: 'pi_cs_test123',
      amount_total: 9900,
      currency: 'eur',
      payment_status: 'paid',
      created: 1700000000,
      customer_details: {
        email: 'test@example.com',
        phone: '+123456789',
        name: 'Test Customer',
      },
      metadata: {},
    } as unknown as Stripe.Checkout.Session;

    const result = await service.syncFromCheckoutSession(session);

    expect(result.action).toBe('created');
    expect(stripeRepository.upsertOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        externalId: 'pi_cs_test123',
        update: expect.objectContaining({
          amount: 9900,
          currency: Currency.EUR,
          status: OrderStatus.PAID,
          purchaserId: 'user-123',
        }) as unknown as Record<string, unknown>,
      }),
    );
  });

  it('should dispatch history sync job to BullMQ queue', async () => {
    const result = await service.syncHistory({
      startDate: '2026-09-01T00:00:00.000Z',
      endDate: '2026-09-10T00:00:00.000Z',
      limit: 50,
    });

    expect(result.enqueued).toBe(true);
    expect(queue.add).toHaveBeenCalledWith(
      'sync-payment-intents-page',
      expect.objectContaining({
        limit: 50,
      }),
    );
  });
});
