import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MeetingPlatform, MeetingType, RecordingSource } from '@prisma/client';
import { PlatformUserTranscriptRepository } from '../repositories/platform-user-transcript.repository';
import { PlatformUserTranscriptService } from './platform-user-transcript.service';

const segment = (
  id: string,
  speakerId: string | null,
  startTimeMs: number,
) => ({
  id,
  speakerId,
  speakerName: speakerId ? `speaker-${speakerId}` : null,
  startTimeMs: BigInt(startTimeMs),
  endTimeMs: BigInt(startTimeMs + 1_000),
  text: `text-${id}`,
  speaker: speakerId
    ? { id: speakerId, displayName: `user-${speakerId}` }
    : null,
});

describe('PlatformUserTranscriptService', () => {
  let repository: {
    findPlatformUser: jest.Mock;
    findMinuteTranscripts: jest.Mock;
    findMinuteContextSource: jest.Mock;
  };
  let service: PlatformUserTranscriptService;

  beforeEach(() => {
    repository = {
      findPlatformUser: jest.fn().mockResolvedValue({
        id: 'target',
        displayName: 'Target User',
      }),
      findMinuteTranscripts: jest.fn(),
      findMinuteContextSource: jest.fn(),
    };
    service = new PlatformUserTranscriptService(
      repository as unknown as PlatformUserTranscriptRepository,
    );
  });

  it('maps matching minutes, optional meetings and target transcript segments', async () => {
    repository.findMinuteTranscripts.mockResolvedValue([
      {
        id: 'minute-1',
        externalId: null,
        source: RecordingSource.PLATFORM_AUTO,
        startAt: new Date('2026-08-02T01:00:00Z'),
        endAt: null,
        meeting: {
          id: 'meeting-1',
          title: 'One-time meeting',
          platform: MeetingPlatform.TENCENT_MEETING,
          type: MeetingType.ONE_TIME,
          startAt: new Date('2026-08-02T01:00:00Z'),
          endAt: null,
        },
        transcripts: [
          { id: 'transcript-1', segments: [segment('s1', 'target', 0)] },
        ],
      },
      {
        id: 'minute-2',
        externalId: 'external-2',
        source: RecordingSource.THIRD_PARTY,
        startAt: new Date('2026-08-01T01:00:00Z'),
        endAt: null,
        meeting: null,
        transcripts: [
          { id: 'transcript-2', segments: [segment('s2', 'target', 1_000)] },
        ],
      },
    ]);

    const result = await service.getMinuteTranscripts(
      'target',
      '2026-08-01T00:00:00Z',
      '2026-09-01T00:00:00Z',
    );

    expect(result.minutes).toHaveLength(2);
    expect(result.minutes[0].meeting?.type).toBe(MeetingType.ONE_TIME);
    expect(result.minutes[0].transcripts[0].segments[0]).toEqual({
      id: 's1',
      speakerName: 'speaker-target',
      startTime: '00:00:00',
      endTime: '00:00:01',
      text: 'text-s1',
      platformUser: { id: 'target', displayName: 'user-target' },
    });
    expect(result.minutes[1].meeting).toBeNull();
  });

  it('rejects reversed and longer-than-31-day ranges', async () => {
    await expect(
      service.getMinuteTranscripts(
        'target',
        '2026-08-02T00:00:00Z',
        '2026-08-01T00:00:00Z',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.getMinuteTranscripts(
        'target',
        '2026-08-01T00:00:00Z',
        '2026-09-02T00:00:00Z',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('computes each target window independently, merges overlaps and keeps transcripts separate', async () => {
    repository.findMinuteContextSource.mockResolvedValue({
      id: 'minute-1',
      meeting: { participants: [{ id: 'participant-1' }] },
      transcripts: [
        {
          id: 'transcript-1',
          segments: [
            segment('s0', 'other', 0),
            segment('s1', 'target', 1_000),
            segment('s2', 'other', 2_000),
            segment('s3', 'target', 3_000),
            segment('s4', 'other', 4_000),
            segment('s5', 'other', 5_000),
          ],
        },
        {
          id: 'transcript-2',
          segments: [segment('s6', 'target', 0), segment('s7', 'other', 1_000)],
        },
      ],
    });

    const result = await service.getTranscriptContext('target', 'minute-1', 1);

    expect(result.transcripts[0].segments.map(({ id }) => id)).toEqual([
      's0',
      's1',
      's2',
      's3',
      's4',
    ]);
    expect(
      result.transcripts[0].segments.map(
        ({ isTargetSpeaker }) => isTargetSpeaker,
      ),
    ).toEqual([false, true, false, true, false]);
    expect(result.transcripts[1].segments.map(({ id }) => id)).toEqual([
      's6',
      's7',
    ]);
  });

  it('returns empty segment groups when transcripts contain no target speech', async () => {
    repository.findMinuteContextSource.mockResolvedValue({
      id: 'minute-1',
      meeting: { participants: [{ id: 'participant-1' }] },
      transcripts: [
        { id: 'transcript-1', segments: [segment('s1', 'other', 0)] },
      ],
    });

    const result = await service.getTranscriptContext('target', 'minute-1', 20);

    expect(result.transcripts).toEqual([
      { transcriptId: 'transcript-1', segments: [] },
    ]);
  });

  it.each([
    { minute: null, scenario: 'missing minute' },
    {
      minute: { id: 'minute-1', meeting: null, transcripts: [] },
      scenario: 'missing meeting',
    },
    {
      minute: {
        id: 'minute-1',
        meeting: { participants: [] },
        transcripts: [],
      },
      scenario: 'missing participation',
    },
    {
      minute: {
        id: 'minute-1',
        meeting: { participants: [{ id: 'participant-1' }] },
        transcripts: [],
      },
      scenario: 'missing transcript',
    },
  ])('returns 404 for $scenario', async ({ minute }) => {
    repository.findMinuteContextSource.mockResolvedValue(minute);

    await expect(
      service.getTranscriptContext('target', 'minute-1', 1),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
