/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { PrismaService } from '@/prisma/prisma.service';
import { TranscriptRepository } from './transcript.repository';

describe('TranscriptRepository', () => {
  const createRepository = () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const repository = new TranscriptRepository({
      transcript: { findFirst },
    } as unknown as PrismaService);
    return { findFirst, repository };
  };

  it('uses a minimal speaker projection by default', async () => {
    const { findFirst, repository } = createRepository();

    await repository.findDetails('minute-1');

    const query = findFirst.mock.calls[0][0];
    const speakerSelect = query.select.segments.select.speaker.select;
    expect(query.where).toEqual({ minuteId: 'minute-1' });
    expect(speakerSelect).toEqual({ id: true, displayName: true });
  });

  it('selects only the requested local user profile fields', async () => {
    const { findFirst, repository } = createRepository();

    await repository.findDetailsWithLocalUser('minute-1');

    const query = findFirst.mock.calls[0][0];
    expect(query.select.segments.select.speaker.select.user).toEqual({
      select: {
        id: true,
        profile: {
          select: {
            displayName: true,
            fullName: true,
          },
        },
      },
    });
  });
});
