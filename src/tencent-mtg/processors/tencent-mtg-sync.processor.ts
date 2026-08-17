import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { TencentMtgSyncService } from '../services/sync.service';

interface SyncJobData {
  startTime: number;
  endTime: number;
  operatorId?: string;
  syncTranscripts?: boolean;
  syncSummaries?: boolean;
  syncParticipants?: boolean;
  forceReSyncTranscript?: boolean;
}

@Processor('tencent-mtg-sync', {
  concurrency: 1,
  limiter: {
    max: 5,
    duration: 60000,
  },
})
export class TencentMtgSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(TencentMtgSyncProcessor.name);

  constructor(private readonly syncService: TencentMtgSyncService) {
    super();
  }

  async process(job: Job<SyncJobData>) {
    const {
      startTime,
      endTime,
      operatorId,
      syncTranscripts,
      syncSummaries,
      syncParticipants,
      forceReSyncTranscript,
    } = job.data;

    this.logger.log(
      `Processing job ${job.id}: Syncing ${new Date(startTime * 1000).toISOString()} ~ ${new Date(endTime * 1000).toISOString()} (syncTranscripts=${syncTranscripts ?? true}, syncSummaries=${syncSummaries ?? true}, syncParticipants=${syncParticipants ?? true})`,
    );

    await job.log(
      `Starting sync process for period: ${new Date(startTime * 1000).toISOString()} ~ ${new Date(endTime * 1000).toISOString()} (syncTranscripts=${syncTranscripts ?? true}, syncSummaries=${syncSummaries ?? true}, syncParticipants=${syncParticipants ?? true})`,
    );

    const result = await this.syncService.syncRecords(
      startTime,
      endTime,
      operatorId,
      forceReSyncTranscript,
      syncTranscripts,
      syncSummaries,
      syncParticipants,
    );

    this.logger.log(
      `Job ${job.id} completed: ${result.meetingsUpserted} meetings, ${result.recordingsUpserted} recordings upserted, ${result.errors.length} errors`,
    );

    await job.log(
      `Job completed. Results: ${result.meetingsUpserted} meetings upserted, ${result.recordingsUpserted} recordings upserted, ${result.errors.length} errors.`,
    );

    return result;
  }
}
