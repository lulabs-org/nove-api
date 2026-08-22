/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { SpeakerSummaryRepository } from './speaker-summary.repository';
import { PrismaService } from '@/prisma/prisma.service';

describe('SpeakerSummaryRepository', () => {
  it('loads the complete generation context from the recording aggregate', async () => {
    const findFirst = jest.fn().mockResolvedValue({ id: 'recording-1' });
    const repository = new SpeakerSummaryRepository({
      minute: { findFirst },
    } as unknown as PrismaService);

    await repository.findGenerationContext('recording-1');

    expect(findFirst).toHaveBeenCalledTimes(1);
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'recording-1',
          deletedAt: null,
        },
        select: expect.objectContaining({
          summaries: expect.objectContaining({
            where: { isLatest: true },
            orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
            take: 1,
          }),
          transcripts: expect.objectContaining({
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              segments: expect.objectContaining({
                orderBy: { startTimeMs: 'asc' },
                select: expect.objectContaining({
                  speaker: expect.objectContaining({
                    select: expect.objectContaining({ displayName: true }),
                  }),
                }),
              }),
            },
          }),
        }),
      }),
    );
  });
});
