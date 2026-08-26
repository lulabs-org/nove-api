import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WebhookStatus, Prisma } from '@prisma/client';

export interface CreateWebhookLogParams {
  provider: string;
  event: string;
  payload: Prisma.InputJsonValue;
  data?: Prisma.InputJsonValue;
  headers?: Prisma.InputJsonValue;
  status?: WebhookStatus;
  errorMessage?: string;
  externalId?: string;
}

@Injectable()
export class WebhookLogService {
  private readonly logger = new Logger(WebhookLogService.name);

  constructor(private prisma: PrismaService) {}

  async createLog(params: CreateWebhookLogParams) {
    try {
      return await this.prisma.webhookLog.create({
        data: {
          provider: params.provider,
          event: params.event,
          payload: params.payload ?? {},
          data: params.data,
          headers: params.headers,
          status: params.status ?? WebhookStatus.PENDING,
          errorMessage: params.errorMessage,
          externalId: params.externalId,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to save webhook log for provider ${params.provider}`,
        error instanceof Error ? error.stack : undefined,
      );
      return null;
    }
  }
}
