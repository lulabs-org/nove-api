import { NotFoundException } from '@nestjs/common';
import {
  MeetingRecordNotFoundException,
  MeetingSummaryNotFoundException,
  RecordingNotFoundException,
} from '@/meeting/exceptions/meeting.exceptions';
import { generatePrompt } from '@/common/utils';
import { LlmService } from '@/llm/llm.service';
import { RecordingParticipantSummaryRepository } from '../repositories';
import { ParticipantSummaryService } from './participant-summary.service';

jest.mock('@/common/utils', () => ({
  generatePrompt: jest.fn(() => ({
    systemPrompt: 'system prompt',
    prompt: 'participant prompt',
  })),
}));

describe('ParticipantSummaryService', () => {
  const meetingSummary = {
    aiMinutes: { sections: [] },
    keyPoints: [],
    actionItems: [],
    decisions: [],
    goldenQuotes: [],
    keywords: ['AI'],
  };
  const context = {
    id: 'recording-1',
    startAt: new Date('2026-03-30T01:00:00Z'),
    endAt: new Date('2026-03-30T02:00:00Z'),
    meeting: {
      id: 'meeting-1',
      title: 'Weekly meeting',
      startAt: new Date('2026-03-30T01:00:00Z'),
      endAt: new Date('2026-03-30T02:00:00Z'),
      deletedAt: null,
      summaries: [meetingSummary],
    },
    transcripts: [
      {
        segments: [
          {
            startTimeMs: 1_000n,
            speakerName: 'Alice',
            text: 'Hello',
            speaker: { id: 'platform-user-1', displayName: 'Alice' },
          },
        ],
      },
    ],
  };

  let llmService: { ask: jest.Mock };
  let repository: {
    findGenerationContext: jest.Mock;
    saveNewVersion: jest.Mock;
  };
  let service: ParticipantSummaryService;

  beforeEach(() => {
    llmService = { ask: jest.fn().mockResolvedValue('generated summary') };
    repository = {
      findGenerationContext: jest.fn().mockResolvedValue(context),
      saveNewVersion: jest.fn().mockResolvedValue(undefined),
    };
    service = new ParticipantSummaryService(
      llmService as unknown as LlmService,
      repository as unknown as RecordingParticipantSummaryRepository,
      {
        apiKey: { ark: '', openai: '' },
        baseURL: 'https://example.com',
        model: 'test-model',
        maxTokens: 16_000,
        temperature: 0.7,
      },
    );
    jest.clearAllMocks();
  });

  it('generates and saves a summary using two parallel context lookups', async () => {
    await expect(
      service.generateSummaries({
        recordId: 'recording-1',
        platformUserIds: ['platform-user-1'],
      }),
    ).resolves.toEqual({ 'platform-user-1': 'generated summary' });

    expect(repository.findGenerationContext).toHaveBeenCalledTimes(1);
    expect(repository.findGenerationContext).toHaveBeenCalledWith(
      'recording-1',
    );
    expect(generatePrompt).toHaveBeenCalledWith(
      'PARTICIPANT_SUMMARY',
      expect.objectContaining({
        userName: 'Alice',
        meetingId: 'meeting-1',
        meetingTitle: 'Weekly meeting',
        keywords: 'AI',
        segments: [['00:00:01', 'Alice', 'Hello']],
      }),
    );
    expect(llmService.ask).toHaveBeenCalledWith(
      'participant prompt',
      'system prompt',
    );
    expect(repository.saveNewVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        platformUserId: 'platform-user-1',
        meetingId: 'meeting-1',
        meetingRecordingId: 'recording-1',
        userName: 'Alice',
        partSummary: 'generated summary',
        aiModel: 'test-model',
      }),
    );
  });

  it('throws when the recording does not exist', async () => {
    repository.findGenerationContext.mockResolvedValue(null);

    await expect(
      service.generateSummaries({
        recordId: 'missing-recording',
        platformUserIds: ['platform-user-1'],
      }),
    ).rejects.toBeInstanceOf(RecordingNotFoundException);
  });

  it('throws when the meeting was soft-deleted', async () => {
    repository.findGenerationContext.mockResolvedValue({
      ...context,
      meeting: { ...context.meeting, deletedAt: new Date() },
    });

    await expect(
      service.generateSummaries({
        recordId: 'recording-1',
        platformUserIds: ['platform-user-1'],
      }),
    ).rejects.toBeInstanceOf(MeetingRecordNotFoundException);
  });

  it('throws when the latest meeting summary does not exist', async () => {
    repository.findGenerationContext.mockResolvedValue({
      ...context,
      meeting: { ...context.meeting, summaries: [] },
    });

    await expect(
      service.generateSummaries({
        recordId: 'recording-1',
        platformUserIds: ['platform-user-1'],
      }),
    ).rejects.toBeInstanceOf(MeetingSummaryNotFoundException);
  });

  it('throws when the transcript does not exist', async () => {
    repository.findGenerationContext.mockResolvedValue({
      ...context,
      transcripts: [],
    });

    await expect(
      service.generateSummaries({
        recordId: 'recording-1',
        platformUserIds: ['platform-user-1'],
      }),
    ).rejects.toEqual(new NotFoundException('转录记录不存在: recording-1'));
  });
});
