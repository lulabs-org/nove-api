import { ProcessingStatus } from '../../minute/enums/status.enum';
import { MeetingPlatform, MeetingType } from '@prisma/client';
import { MeetingRepository } from '../repositories/meeting.repository';
import { MeetingParticipantRepository } from '../repositories/meeting-participant.repository';
import { MeetingService } from './meeting.service';
import { MeetingRecordNotFoundException } from '../exceptions/meeting.exceptions';
import { PrismaService } from '@/prisma/prisma.service';

describe('MeetingService', () => {
  const repository = {
    findByPt: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    get: jest.fn(),
    getStats: jest.fn(),
    exists: jest.fn(),
  };
  const participantRepository = {
    findMany: jest.fn(),
  };
  let service: MeetingService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MeetingService(
      repository as unknown as MeetingRepository,
      participantRepository as unknown as MeetingParticipantRepository,
      {} as PrismaService,
    );
  });

  it('uses the database root sub-meeting ID and seconds when creating', async () => {
    repository.findByPt.mockResolvedValue(null);
    repository.create.mockResolvedValue({ id: 'meeting-1' });

    await service.create(
      {
        platform: MeetingPlatform.TENCENT_MEETING,
        platformMeetingId: 'platform-meeting-1',
        title: 'Meeting',
        type: MeetingType.RECURRING,
        durationSeconds: 3600,
      },
      'org-1',
    );

    expect(repository.findByPt).toHaveBeenCalledWith(
      MeetingPlatform.TENCENT_MEETING,
      'platform-meeting-1',
      '__ROOT__',
    );
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        subMeetingId: '__ROOT__',
        orgId: 'org-1',
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

  it('returns a paginated participant list after checking the meeting', async () => {
    repository.exists.mockResolvedValue(true);
    participantRepository.findMany.mockResolvedValue({
      records: [{ id: 'participant-1' }],
      total: 1,
    });

    await expect(
      service.findParticipants('meeting-1', {
        page: 2,
        limit: 20,
        search: '杨',
      }),
    ).resolves.toEqual({
      data: [{ id: 'participant-1' }],
      total: 1,
      page: 2,
      limit: 20,
      totalPages: 1,
    });
    expect(participantRepository.findMany).toHaveBeenCalledWith('meeting-1', {
      skip: 20,
      take: 20,
      search: '杨',
    });
  });

  it('rejects a participant query for a missing meeting', async () => {
    repository.exists.mockResolvedValue(false);

    await expect(
      service.findParticipants('missing-meeting', { page: 1, limit: 50 }),
    ).rejects.toBeInstanceOf(MeetingRecordNotFoundException);
    expect(participantRepository.findMany).not.toHaveBeenCalled();
  });
});
