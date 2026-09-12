import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import { WebhookStatus } from '@prisma/client';
import { StripeWebhookController } from './stripe-webhook.controller';
import { StripeClientService } from '../services/stripe-client.service';
import { StripeEventService } from '../services/stripe-event.service';
import { WebhookLogService } from '@/webhook-log/webhook-log.service';

describe('StripeWebhookController', () => {
  let controller: StripeWebhookController;
  let stripeClientService: Partial<StripeClientService>;
  let stripeEventService: Partial<StripeEventService>;
  let webhookLogService: Partial<WebhookLogService>;

  beforeEach(async () => {
    stripeClientService = {
      constructEvent: jest.fn(),
    };
    stripeEventService = {
      handleEvent: jest.fn().mockResolvedValue({ success: true }),
    };
    webhookLogService = {
      createLog: jest.fn().mockResolvedValue({ id: 'log-1' } as any),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StripeWebhookController],
      providers: [
        { provide: StripeClientService, useValue: stripeClientService },
        { provide: StripeEventService, useValue: stripeEventService },
        { provide: WebhookLogService, useValue: webhookLogService },
      ],
    }).compile();

    controller = module.get<StripeWebhookController>(StripeWebhookController);
  });

  it('should throw BadRequestException if signature is missing', async () => {
    const req = {
      rawBody: Buffer.from('test'),
    } as unknown as RawBodyRequest<Request>;
    await expect(controller.handleWebhook(req, '')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('should log failed attempt and throw when constructEvent fails', async () => {
    (stripeClientService.constructEvent as jest.Mock).mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    const req = {
      rawBody: Buffer.from('test'),
      headers: {},
    } as unknown as RawBodyRequest<Request>;
    await expect(controller.handleWebhook(req, 'sig_123')).rejects.toThrow(
      BadRequestException,
    );

    expect(webhookLogService.createLog).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'stripe',
        status: WebhookStatus.FAILED,
      }),
    );
  });

  it('should verify event, log success and dispatch to event service', async () => {
    const mockEvent = { id: 'evt_123', type: 'payment_intent.succeeded' };
    (stripeClientService.constructEvent as jest.Mock).mockReturnValue(
      mockEvent,
    );

    const req = {
      rawBody: Buffer.from('test'),
      headers: {},
    } as unknown as RawBodyRequest<Request>;
    const res = await controller.handleWebhook(req, 'sig_valid');

    expect(res).toEqual({ received: true, result: { success: true } });
    expect(webhookLogService.createLog).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'stripe',
        event: 'payment_intent.succeeded',
        status: WebhookStatus.SUCCESS,
      }),
    );
    expect(stripeEventService.handleEvent).toHaveBeenCalledWith(mockEvent);
  });
});
