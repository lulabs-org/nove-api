/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { GenerationMethod } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { MinuteSummaryRepository } from './minute-summary.repository';

describe('MinuteSummaryRepository', () => {
  it('upserts summary content', async () => {
    const upsert = jest.fn().mockResolvedValue({
      id: 'summary-1',
      minuteId: 'recording-1',
      content: 'New content',
    });
    const repository = new MinuteSummaryRepository({
      minuteSummary: { upsert },
    } as unknown as PrismaService);

    const result = await repository.upsert('recording-1', {
      content: 'New content',
      aiModel: 'GPT-4',
      generatedBy: GenerationMethod.AI,
    });

    expect(upsert).toHaveBeenCalledWith({
      where: { minuteId: 'recording-1' },
      create: expect.objectContaining({
        minuteId: 'recording-1',
        content: 'New content',
        generatedBy: GenerationMethod.AI,
        aiModel: 'GPT-4',
      }),
      update: expect.objectContaining({
        content: 'New content',
      }),
    });
    expect(result).toEqual(expect.objectContaining({ id: 'summary-1' }));
  });
});
