import { Test } from '@nestjs/testing';
import { MinuteSummaryNotFoundException } from '@/meeting/exceptions/meeting.exceptions';
import { MinuteRepository } from '../repositories/minute.repository';
import { MinuteSummaryRepository } from '../repositories/minute-summary.repository';
import { MinuteService } from './minute.service';

describe('MinuteService', () => {
  let service: MinuteService;
  let recordings: {
    findById: jest.Mock;
  };
  let summaries: {
    findByRecordingId: jest.Mock;
    createExternalForRecording: jest.Mock;
  };

  beforeEach(async () => {
    recordings = { findById: jest.fn() };
    summaries = {
      findByRecordingId: jest.fn(),
      createExternalForRecording: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        MinuteService,
        { provide: MinuteRepository, useValue: recordings },
        { provide: MinuteSummaryRepository, useValue: summaries },
      ],
    }).compile();

    service = moduleRef.get(MinuteService);
  });

  it('returns the latest summary for an existing recording', async () => {
    recordings.findById.mockResolvedValue({
      id: 'recording-1',
      meetingId: 'meeting-1',
    });
    summaries.findByRecordingId.mockResolvedValue({ id: 'summary-1' });

    await expect(service.getSummary('recording-1')).resolves.toEqual({
      id: 'summary-1',
    });
    expect(summaries.findByRecordingId).toHaveBeenCalledWith('recording-1');
  });

  it('throws when an existing recording has no summary', async () => {
    recordings.findById.mockResolvedValue({
      id: 'recording-1',
      meetingId: 'meeting-1',
    });
    summaries.findByRecordingId.mockResolvedValue(null);

    await expect(service.getSummary('recording-1')).rejects.toBeInstanceOf(
      MinuteSummaryNotFoundException,
    );
  });

  it('associates an external summary with the recording meeting', async () => {
    recordings.findById.mockResolvedValue({
      id: 'recording-1',
      meetingId: 'meeting-1',
    });
    summaries.createExternalForRecording.mockResolvedValue({
      id: 'summary-1',
      content: 'External summary',
    });

    await expect(
      service.createSummary('recording-1', {
        content: 'External summary',
        aiModel: 'external-model',
        minuteId: 'recording-1',
      }),
    ).resolves.toEqual({ id: 'summary-1', content: 'External summary' });
    expect(summaries.createExternalForRecording).toHaveBeenCalledWith(
      'meeting-1',
      'recording-1',
      {
        content: 'External summary',
        aiModel: 'external-model',
        minuteId: 'recording-1',
      },
    );
  });
});
