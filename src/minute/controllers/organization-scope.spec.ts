import { ForbiddenException } from '@nestjs/common';
import { MinuteService } from '../services/minute.service';
import { MinuteRepository } from '../repositories/minute.repository';
import { MinuteSummaryRepository } from '../repositories/minute-summary.repository';
import { PrismaService } from '@/prisma/prisma.service';
import { MinuteController } from './minute.controller';
import { TranscriptService } from '../services/transcript.service';
import { MinuteSummaryController } from './minute-summary.controller';
import { MinuteSummaryService } from '../services/minute-summary.service';
import { SpeakerSummaryController } from './speaker-summary.controller';
import { SpeakerSummaryCrudService } from '../services/speaker-summary-crud.service';
import { SpeakerSummaryService } from '../services/speaker-summary.service';
import { RecordingNotFoundException } from '@/meeting/exceptions/meeting.exceptions';

describe('Minute API organization boundary', () => {
  const repository = {
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  const prisma = { meeting: { findFirst: jest.fn() } };
  const minutes = new MinuteService(
    repository as unknown as MinuteRepository,
    {} as MinuteSummaryRepository,
    prisma as unknown as PrismaService,
  );

  beforeEach(() => jest.resetAllMocks());

  it('blocks transcript reads and summary generation when the minute is inaccessible', async () => {
    repository.findById.mockResolvedValue(null);
    const transcript = { getJson: jest.fn(), getText: jest.fn() };
    const summary = { findByMinuteId: jest.fn() };
    const ai = { generateSummaries: jest.fn() };
    const minuteController = new MinuteController(
      minutes,
      transcript as unknown as TranscriptService,
    );
    const summaryController = new MinuteSummaryController(
      summary as unknown as MinuteSummaryService,
      minutes,
    );
    const speakers = new SpeakerSummaryController(
      {} as SpeakerSummaryCrudService,
      ai as unknown as SpeakerSummaryService,
      minutes,
    );
    await expect(
      minuteController.getTranscript('foreign-minute', {}, 'org-a'),
    ).rejects.toBeInstanceOf(RecordingNotFoundException);
    await expect(
      minuteController.getTranscriptText('foreign-minute', 'org-a'),
    ).rejects.toBeInstanceOf(RecordingNotFoundException);
    await expect(
      summaryController.getSummary('foreign-minute', 'org-a'),
    ).rejects.toBeInstanceOf(RecordingNotFoundException);
    await expect(
      speakers.generateSummaries('foreign-minute', {}, 'org-a'),
    ).rejects.toBeInstanceOf(RecordingNotFoundException);
    expect(transcript.getJson).not.toHaveBeenCalled();
    expect(transcript.getText).not.toHaveBeenCalled();
    expect(summary.findByMinuteId).not.toHaveBeenCalled();
    expect(ai.generateSummaries).not.toHaveBeenCalled();
  });

  it('rejects reassociation with a foreign meeting or clearing the meeting', async () => {
    repository.findById.mockResolvedValue({ id: 'minute-a' });
    prisma.meeting.findFirst.mockResolvedValue(null);
    await expect(
      minutes.update('minute-a', { meetingId: 'foreign-meeting' }, 'org-a'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    // PartialType accepts null at runtime; it must not disconnect ownership.
    await expect(
      minutes.update(
        'minute-a',
        { meetingId: null as unknown as string },
        'org-a',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rejects missing organization before querying or deleting', async () => {
    await expect(minutes.getById('minute-a', '')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(minutes.delete('minute-a', '')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(repository.findById).not.toHaveBeenCalled();
    expect(repository.delete).not.toHaveBeenCalled();
  });
});
