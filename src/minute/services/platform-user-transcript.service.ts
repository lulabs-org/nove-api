import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { formatTimeMs } from '@/common/utils/time.util';
import {
  PlatformUserMinuteTranscriptsResponseDto,
  PlatformUserTranscriptContextResponseDto,
  PlatformUserTranscriptSegmentDto,
} from '../dto/platform-user-transcript.dto';
import { PlatformUserTranscriptRepository } from '../repositories/platform-user-transcript.repository';

const MAX_QUERY_RANGE_MS = 31 * 24 * 60 * 60 * 1000;

type TranscriptSegmentRecord = {
  id: string;
  speakerId: string | null;
  speakerName: string | null;
  startTimeMs: bigint;
  endTimeMs: bigint;
  text: string;
  speaker: { id: string; displayName: string | null } | null;
};

@Injectable()
export class PlatformUserTranscriptService {
  constructor(private readonly repository: PlatformUserTranscriptRepository) {}

  async getMinuteTranscripts(
    platformUserId: string,
    startDateValue: string,
    endDateValue: string,
    orgId?: string,
  ): Promise<PlatformUserMinuteTranscriptsResponseDto> {
    const { startDate, endDate } = this.validateDateRange(
      startDateValue,
      endDateValue,
    );
    const platformUser = await this.ensurePlatformUser(platformUserId);
    const minutes = await this.repository.findMinuteTranscripts(
      platformUserId,
      startDate,
      endDate,
      orgId,
    );

    return {
      platformUser,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      minutes: minutes.map((minute) => ({
        minuteId: minute.id,
        externalId: minute.externalId,
        source: minute.source,
        startAt: minute.startAt,
        endAt: minute.endAt,
        meeting: minute.meeting
          ? {
              meetingId: minute.meeting.id,
              title: minute.meeting.title,
              platform: minute.meeting.platform,
              type: minute.meeting.type,
              startAt: minute.meeting.startAt,
              endAt: minute.meeting.endAt,
            }
          : null,
        transcripts: minute.transcripts.map((transcript) => ({
          transcriptId: transcript.id,
          segments: transcript.segments.map((segment) =>
            this.mapSegment(segment),
          ),
        })),
      })),
    };
  }

  async getTranscriptContext(
    platformUserId: string,
    minuteId: string,
    depth: number,
    orgId?: string,
  ): Promise<PlatformUserTranscriptContextResponseDto> {
    const platformUser = await this.ensurePlatformUser(platformUserId);
    const minute = await this.repository.findMinuteContextSource(
      minuteId,
      platformUserId,
      orgId,
    );

    if (!minute) {
      throw new NotFoundException('Minute not found');
    }
    if (!minute.meeting || minute.meeting.participants.length === 0) {
      throw new NotFoundException(
        'Platform user did not participate in the minute meeting',
      );
    }
    if (minute.transcripts.length === 0) {
      throw new NotFoundException('Transcript not found for minute');
    }

    return {
      platformUser,
      minuteId: minute.id,
      depth,
      transcripts: minute.transcripts.map((transcript) => {
        const selectedIndexes = new Set<number>();
        const segments = transcript.segments;

        segments.forEach((segment, index) => {
          if (segment.speakerId !== platformUserId) return;
          const start = Math.max(0, index - depth);
          const end = Math.min(segments.length - 1, index + depth);
          for (
            let selectedIndex = start;
            selectedIndex <= end;
            selectedIndex++
          ) {
            selectedIndexes.add(selectedIndex);
          }
        });

        return {
          transcriptId: transcript.id,
          segments: [...selectedIndexes]
            .sort((left, right) => left - right)
            .map((index) => ({
              ...this.mapSegment(segments[index]),
              isTargetSpeaker: segments[index].speakerId === platformUserId,
            })),
        };
      }),
    };
  }

  private async ensurePlatformUser(platformUserId: string) {
    const platformUser = await this.repository.findPlatformUser(platformUserId);
    if (!platformUser) {
      throw new NotFoundException('Platform user not found');
    }
    return platformUser;
  }

  private validateDateRange(startValue: string, endValue: string) {
    const startDate = new Date(startValue);
    const endDate = new Date(endValue);
    const rangeMs = endDate.getTime() - startDate.getTime();

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime()) ||
      rangeMs <= 0
    ) {
      throw new BadRequestException('endDate must be later than startDate');
    }
    if (rangeMs > MAX_QUERY_RANGE_MS) {
      throw new BadRequestException('Date range cannot exceed 31 days');
    }
    return { startDate, endDate };
  }

  private mapSegment(
    segment: TranscriptSegmentRecord,
  ): PlatformUserTranscriptSegmentDto {
    return {
      id: segment.id,
      speakerName: segment.speakerName || '未知发言人',
      startTime: formatTimeMs(Number(segment.startTimeMs)),
      endTime: formatTimeMs(Number(segment.endTimeMs)),
      text: segment.text,
      platformUser: segment.speaker
        ? {
            id: segment.speaker.id,
            displayName: segment.speaker.displayName,
          }
        : null,
    };
  }
}
