/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { GenerationMethod, Prisma, ProcessingStatus } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { MeetingSummaryRepository } from './meeting-summary.repository';

describe('MeetingSummaryRepository', () => {
  it('only returns the latest non-deleted recording summary', async () => {
    const findFirst = jest.fn().mockResolvedValue({ id: 'summary-1' });
    const repository = new MeetingSummaryRepository({
      meetingSummary: { findFirst },
    } as unknown as PrismaService);

    await repository.findByRecordingId('recording-1');

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        recordingId: 'recording-1',
        isLatest: true,
        deletedAt: null,
      },
      orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
    });
  });

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
          callback({ meetingSummary: { findFirst, update, create } }),
        ),
      );
    const repository = new MeetingSummaryRepository({
      $transaction: transaction,
    } as unknown as PrismaService);

    const result = await repository.createExternalForRecording(
      'meeting-1',
      'recording-1',
      {
        content: 'External summary',
        aiModel: 'external-model',
        keywords: ['external'],
      },
    );

    expect(update).toHaveBeenCalledWith({
      where: { id: 'summary-1' },
      data: { isLatest: false },
    });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        meetingId: 'meeting-1',
        recordingId: 'recording-1',
        content: 'External summary',
        keywords: ['external'],
        generatedBy: GenerationMethod.AI,
        aiModel: 'external-model',
        language: 'zh-CN',
        status: ProcessingStatus.COMPLETED,
        version: 3,
        isLatest: true,
        parentSummaryId: 'summary-1',
      }),
    });
    expect(transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
    expect(result).toEqual(expect.objectContaining({ id: 'summary-2' }));
  });
});
