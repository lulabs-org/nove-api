/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ParticipantSummaryRepository } from './participant-summary.repository';
import { PrismaService } from '@/prisma/prisma.service';

describe('ParticipantSummaryRepository', () => {
  it('loads the complete generation context from the recording aggregate', async () => {
    const findFirst = jest.fn().mockResolvedValue({ id: 'recording-1' });
    const repository = new ParticipantSummaryRepository({
      meetingRecording: { findFirst },
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
          meeting: {
            select: expect.objectContaining({
              summaries: expect.objectContaining({
                where: { isLatest: true, deletedAt: null },
                orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
                take: 1,
              }),
            }),
          },
          transcripts: expect.objectContaining({
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              segments: expect.objectContaining({
                where: { deletedAt: null },
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
