import { RecordingSource } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { MinuteSummaryRepository } from '../repositories/minute-summary.repository';
import { MinuteRepository } from '../repositories/minute.repository';
import { MinuteService } from './minute.service';

describe('MinuteService list', () => {
  it('passes search filters and returns pagination metadata', async () => {
    const repository = {
      findMany: jest
        .fn()
        .mockResolvedValue({ total: 21, records: [{ id: 'minute-1' }] }),
    };
    const service = new MinuteService(
      repository as unknown as MinuteRepository,
      {} as MinuteSummaryRepository,
      {} as PrismaService,
    );

    await expect(
      service.findMany({
        search: '周会',
        meetingId: 'meeting-1',
        source: RecordingSource.PLATFORM_AUTO,
        page: 2,
        limit: 10,
      }),
    ).resolves.toEqual({
      data: [{ id: 'minute-1' }],
      total: 21,
      page: 2,
      limit: 10,
      totalPages: 3,
    });
    expect(repository.findMany).toHaveBeenCalledWith({
      search: '周会',
      meetingId: 'meeting-1',
      source: RecordingSource.PLATFORM_AUTO,
      skip: 10,
      take: 10,
    });
  });
});
