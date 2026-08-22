/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { GenerationMethod, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { MinuteSummaryRepository } from './minute-summary.repository';

describe('MinuteSummaryRepository', () => {
  it('creates a new latest version from externally generated content', async () => {
    const previous = { id: 'summary-1', version: 2 };
    const findFirst = jest.fn().mockResolvedValue(previous);
    const update = jest
      .fn()
      .mockResolvedValue({ ...previous, isLatest: false });
    const create = jest.fn(({ data }: { data: Record<string, unknown> }) => ({
      id: 'summary-2',
      ...data,
    }));
    const transaction = jest
      .fn()
      .mockImplementation((callback: (tx: unknown) => unknown) =>
        Promise.resolve(
          callback({ minuteSummary: { findFirst, update, create } }),
        ),
      );
    const repository = new MinuteSummaryRepository({
      $transaction: transaction,
    } as unknown as PrismaService);

    const result = await repository.saveNewVersion('recording-1', {
      content: 'New content',
      aiModel: 'GPT-4',
      keywords: ['tech'],
      minuteId: 'recording-1',
    });

    expect(update).toHaveBeenCalledWith({
      where: { id: 'summary-1' },
      data: { isLatest: false },
    });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        minuteId: 'recording-1',
        content: 'New content',
        keywords: ['tech'],
        generatedBy: GenerationMethod.AI,
        aiModel: 'GPT-4',
        version: 3,
        isLatest: true,
      }),
    });
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    expect(result).toEqual(expect.objectContaining({ id: 'summary-2' }));
  });
});
