import type { Queue } from 'bullmq';
import { SystemConfigService } from '@/admin/system-config/services';
import { TMeetApiClientFactory } from '../client';
import { TMeetMeetingCoreService } from './meeting-core.service';
import { TMeetSummaryCoreService } from './summary-core.service';
import { TMeetSyncService } from './sync.service';
import { TMeetTranscriptCoreService } from './transcript-core.service';

describe('TMeetSyncService organization context', () => {
  it('includes orgId in every enqueued sync chunk', async () => {
    const queue = { add: jest.fn().mockResolvedValue({ id: 'job-1' }) };
    const service = new TMeetSyncService(
      queue as unknown as Queue,
      {} as TMeetApiClientFactory,
      {} as TMeetMeetingCoreService,
      {} as TMeetTranscriptCoreService,
      {} as TMeetSummaryCoreService,
      {} as SystemConfigService,
    );

    await service.syncRecordings('org-1', 1000, 2000, 'operator-1');

    expect(queue.add).toHaveBeenCalledWith(
      'sync-chunk',
      expect.objectContaining({
        orgId: 'org-1',
        startTime: 1000,
        endTime: 2000,
        operatorId: 'operator-1',
      }),
    );
  });
});
