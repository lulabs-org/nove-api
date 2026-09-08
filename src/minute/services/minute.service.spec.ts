import { ForbiddenException } from '@nestjs/common';
import { RecordingSource } from '@prisma/client';
import { MinuteRepository } from '../repositories/minute.repository';
import { MinuteService } from './minute.service';
import { PrismaService } from '@/prisma/prisma.service';

describe('MinuteService list', () => {
  it('passes search filters and returns pagination metadata', async () => {
    const repository = {
      findMany: jest
        .fn()
        .mockResolvedValue({ total: 21, records: [{ id: 'minute-1' }] }),
    };
    const service = new MinuteService(
      repository as unknown as MinuteRepository,
      {} as PrismaService,
    );

    await expect(
      service.findMany(
        {
          search: '周会',
          meetingId: 'meeting-1',
          source: RecordingSource.PLATFORM_AUTO,
          page: 2,
          limit: 10,
        },
        'org-1',
      ),
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
      orgId: 'org-1',
    });
  });

  it('creates a minute only when its meeting belongs to the organization', async () => {
    const repository = {
      create: jest.fn().mockResolvedValue({ id: 'minute-1' }),
    };
    const prisma = {
      meeting: {
        findFirst: jest.fn().mockResolvedValue({ id: 'meeting-1' }),
      },
    };
    const service = new MinuteService(
      repository as unknown as MinuteRepository,
      prisma as unknown as PrismaService,
    );

    await expect(
      service.create({ meetingId: 'meeting-1' }, 'org-1'),
    ).resolves.toEqual({ id: 'minute-1' });
    expect(prisma.meeting.findFirst).toHaveBeenCalledWith({
      where: { id: 'meeting-1', orgId: 'org-1', deletedAt: null },
      select: { id: true },
    });
    expect(repository.create).toHaveBeenCalledWith({
      meetingId: 'meeting-1',
    });
  });

  it('rejects a minute linked to another organization meeting', async () => {
    const repository = { create: jest.fn() };
    const prisma = {
      meeting: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new MinuteService(
      repository as unknown as MinuteRepository,
      prisma as unknown as PrismaService,
    );

    await expect(
      service.create({ meetingId: 'meeting-2' }, 'org-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.create).not.toHaveBeenCalled();
  });
});
