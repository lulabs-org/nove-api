import type { Job } from 'bullmq';
import { TMeetSyncService } from '../services/sync.service';
import { TMeetSyncProcessor } from './tmeet-sync.processor';
import { SingleOrgContextService } from '@/admin/system-config/services';

describe('TMeetSyncProcessor organization context', () => {
  it('forwards the queued orgId to syncRecords', async () => {
    const result = {
      meetingsUpserted: 1,
      recordingsUpserted: 2,
      errors: [],
    };
    const syncService = {
      syncRecords: jest.fn().mockResolvedValue(result),
    };
    const processor = new TMeetSyncProcessor(
      syncService as unknown as TMeetSyncService,
      { getOrgId: () => 'fallback-org' } as SingleOrgContextService,
    );
    const job = {
      id: 'job-1',
      data: { orgId: 'org-1', startTime: 1000, endTime: 2000 },
      log: jest.fn().mockResolvedValue(undefined),
    } as unknown as Job<{
      orgId: string;
      startTime: number;
      endTime: number;
    }>;

    await expect(processor.process(job)).resolves.toBe(result);
    expect(syncService.syncRecords).toHaveBeenCalledWith(
      'org-1',
      1000,
      2000,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );
  });

  it('uses the single-org context for legacy sync jobs', async () => {
    const result = {
      meetingsUpserted: 0,
      recordingsUpserted: 0,
      errors: [],
    };
    const syncService = {
      syncRecords: jest.fn().mockResolvedValue(result),
    };
    const processor = new TMeetSyncProcessor(
      syncService as unknown as TMeetSyncService,
      { getOrgId: () => 'fallback-org' } as SingleOrgContextService,
    );
    const job = {
      id: 'legacy-job',
      data: { startTime: 1000, endTime: 2000 },
      log: jest.fn().mockResolvedValue(undefined),
    } as unknown as Job<{
      startTime: number;
      endTime: number;
    }>;

    await processor.process(job);

    expect(syncService.syncRecords).toHaveBeenCalledWith(
      'fallback-org',
      1000,
      2000,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );
  });
});
