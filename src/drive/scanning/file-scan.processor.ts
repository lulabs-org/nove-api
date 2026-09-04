import { Logger } from '@nestjs/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { FileScanService } from './file-scan.service';
import { DRIVE_SCAN_QUEUE } from './file-scanner.types';

interface FileScanJobData {
  fileVersionId: string;
}

@Processor(DRIVE_SCAN_QUEUE, { concurrency: 4 })
export class FileScanProcessor extends WorkerHost {
  private readonly logger = new Logger(FileScanProcessor.name);

  constructor(private readonly scans: FileScanService) {
    super();
  }

  override async process(job: Job<FileScanJobData>): Promise<void> {
    await this.scans.process(job.data.fileVersionId);
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<FileScanJobData> | undefined, error: Error) {
    if (!job) return;
    const maxAttempts = job.opts.attempts ?? 1;
    if (job.attemptsMade < maxAttempts) return;
    this.logger.error(
      `File scan exhausted retries for ${job.data.fileVersionId}: ${error.message}`,
    );
    await this.scans.markFailed(job.data.fileVersionId, error);
  }
}
