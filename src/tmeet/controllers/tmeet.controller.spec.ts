import { ForbiddenException } from '@nestjs/common';
import { TMeetSyncService } from '../services/sync.service';
import { TMeetUserLinkService } from '../services/user-link.service';
import { TMeetController } from './tmeet.controller';

describe('TMeetController organization context', () => {
  const syncService = {
    syncRecordings: jest.fn().mockResolvedValue({ jobIds: ['job-1'] }),
  };
  const controller = new TMeetController(
    syncService as unknown as TMeetSyncService,
    {} as TMeetUserLinkService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('passes the authenticated orgId into queued synchronization', async () => {
    await controller.syncRecordings({}, 'org-1');

    expect(syncService.syncRecordings).toHaveBeenCalledWith(
      'org-1',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );
  });

  it('rejects synchronization without an organization context', async () => {
    await expect(controller.syncRecordings({}, null)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(syncService.syncRecordings).not.toHaveBeenCalled();
  });
});
