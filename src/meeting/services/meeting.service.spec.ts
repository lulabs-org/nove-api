import { MeetingPlatform, MeetingType, ProcessingStatus } from '@prisma/client';
import { MeetingRepository } from '../repositories/meeting.repository';
import { MeetingService } from './meeting.service';

describe('MeetingService', () => {
  const repository = {
    findByPt: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    get: jest.fn(),
    getStats: jest.fn(),
  };
  let service: MeetingService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MeetingService(repository as unknown as MeetingRepository);
  });

  it('uses the database root sub-meeting ID and seconds when creating', async () => {
    repository.findByPt.mockResolvedValue(null);
    repository.create.mockResolvedValue({ id: 'meeting-1' });

    await service.create({
      platform: MeetingPlatform.TENCENT_MEETING,
      platformMeetingId: 'platform-meeting-1',
      title: 'Meeting',
      type: MeetingType.RECURRING,
      durationSeconds: 3600,
    });

    expect(repository.findByPt).toHaveBeenCalledWith(
      MeetingPlatform.TENCENT_MEETING,
      'platform-meeting-1',
      '__ROOT__',
    );
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        subMeetingId: '__ROOT__',
        durationSeconds: 3600,
      }),
    );
  });

  it('returns the record produced by the soft-delete mutation', async () => {
    const beforeDelete = { id: 'meeting-1', deletedAt: null };
    const deletedAt = new Date('2026-08-13T01:00:00.000Z');
    const afterDelete = { id: 'meeting-1', deletedAt };
    repository.findById.mockResolvedValue(beforeDelete);
    repository.softDelete.mockResolvedValue(afterDelete);

    await expect(service.delete('meeting-1')).resolves.toBe(afterDelete);
  });

  it('delegates statistics to the repository', async () => {
    const stats = {
      total: 1,
      platformStats: [{ platform: MeetingPlatform.TENCENT_MEETING, count: 1 }],
      statusStats: [{ status: ProcessingStatus.COMPLETED, count: 1 }],
      typeStats: [{ type: MeetingType.SCHEDULED, count: 1 }],
      recentMeetings: [],
    };
    repository.getStats.mockResolvedValue(stats);

    await expect(service.getStats({})).resolves.toBe(stats);
  });
});
