import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from '@/auth/decorators/public.decorator';
import { Prisma, WebhookStatus } from '@prisma/client';
import Stripe from 'stripe';
import { StripeClientService } from '../services/stripe-client.service';
import { StripeEventService } from '../services/stripe-event.service';
import { WebhookLogService } from '@/webhook-log/webhook-log.service';

@ApiTags('Webhooks')
@Controller('webhooks/stripe')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private readonly stripeClientService: StripeClientService,
    private readonly stripeEventService: StripeEventService,
    private readonly webhookLogService: WebhookLogService,
  ) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Receive Stripe webhooks',
    description:
      '接收并验签 Stripe Webhook 回调事件，幂等处理结账支付与售后退款。',
  })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid signature or payload' })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException('Raw request body is missing');
    }

    let event: Stripe.Event;
    try {
      event = this.stripeClientService.constructEvent(rawBody, signature);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      await this.webhookLogService.createLog({
        provider: 'stripe',
        event: 'signature_verification_failed',
        payload: { error: errorMessage },
        headers: req.headers as unknown as Prisma.InputJsonValue,
        status: WebhookStatus.FAILED,
        errorMessage,
      });
      throw new BadRequestException(
        `Stripe webhook signature error: ${errorMessage}`,
      );
    }

    await this.webhookLogService.createLog({
      provider: 'stripe',
      event: event.type,
      payload: event as unknown as Prisma.InputJsonValue,
      headers: req.headers as unknown as Prisma.InputJsonValue,
      status: WebhookStatus.SUCCESS,
      externalId: event.id,
    });

    const result = await this.stripeEventService.handleEvent(event);
    return { received: true, result };
  }
}
