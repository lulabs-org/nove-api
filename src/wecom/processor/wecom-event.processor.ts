import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { WecomCustomerService } from '../service/wecom-customer.service';

@Processor('wecom-event')
export class WecomEventProcessor extends WorkerHost {
  private readonly logger = new Logger(WecomEventProcessor.name);

  constructor(private readonly wecomCustomerService: WecomCustomerService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.debug(
      `Processing WeCom event job ${job.id} of type ${job.name}`,
    );

    try {
      if (job.name === 'sync_external_contact') {
        const { externalUserId } = job.data as { externalUserId: string };
        if (!externalUserId) {
          throw new Error('Missing externalUserId in job data');
        }
        await this.wecomCustomerService.syncExternalContact(externalUserId);
      } else {
        this.logger.warn(`Unknown job name: ${job.name}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to process WeCom event job ${job.id}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }
}
