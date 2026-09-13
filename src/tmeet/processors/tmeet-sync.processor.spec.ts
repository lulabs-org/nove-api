import type { Job } from 'bullmq';
import { TMeetSyncService } from '../services/sync.service';
import { TMeetSyncProcessor } from './tmeet-sync.processor';
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

  it('throws an error if orgId is missing', async () => {
    const syncService = {
      syncRecords: jest.fn(),
    };
    const processor = new TMeetSyncProcessor(
      syncService as unknown as TMeetSyncService,
    );
    const job = {
      id: 'job-without-org',
      data: { startTime: 1000, endTime: 2000 },
      log: jest.fn().mockResolvedValue(undefined),
    } as unknown as Job<{
      orgId: string;
      startTime: number;
      endTime: number;
    }>;

    await expect(processor.process(job)).rejects.toThrow(
      'Sync job job-without-org missing required orgId',
    );
    expect(syncService.syncRecords).not.toHaveBeenCalled();
  });
});
