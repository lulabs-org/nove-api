import {
  MeetingType,
  RecordingStatus,
  ProcessingStatus,
} from '@prisma/client';

const TENCENT_MEETING_TYPE_RECURRING = 1;

export function computeSubMeetingId(
  mediaStartTimeMs: number,
  meetingStartTimeSec: string,
): string {
  const combined = mergeDateTime(
    mediaStartTimeMs,
    meetingStartTimeSec,
  )!;
  return String(Math.floor(combined.getTime() / 1000));
}

export function mergeDateTime(
  mediaStartTimeMs: number,
  meetingTimeSec: string | undefined,
): Date | undefined {
  if (!meetingTimeSec) return undefined;

  const mediaDate = new Date(mediaStartTimeMs);
  const year = mediaDate.getUTCFullYear();
  const month = mediaDate.getUTCMonth();
  const day = mediaDate.getUTCDate();

  const meetingDate = new Date(Number(meetingTimeSec) * 1000);
  const hours = meetingDate.getUTCHours();
  const minutes = meetingDate.getUTCMinutes();
  const seconds = meetingDate.getUTCSeconds();

  return new Date(Date.UTC(year, month, day, hours, minutes, seconds));
}

export function convertMeetingType(meetingType?: number): MeetingType {
  switch (meetingType) {
    case 0:
      return MeetingType.ONE_TIME;
    case 1:
      return MeetingType.RECURRING;
    case 2:
    case 4:
      return MeetingType.INSTANT;
    case 5:
      return MeetingType.SCHEDULED;
    default:
      return MeetingType.SCHEDULED;
  }
}

export function mapRecordingState(state: number): ProcessingStatus {
  switch (state) {
    case 1:
    case 2:
      return ProcessingStatus.PROCESSING;
    case 3:
      return ProcessingStatus.COMPLETED;
    default:
      return ProcessingStatus.PENDING;
  }
}

export function mapRecordingFileStatus(state: number): RecordingStatus {
  switch (state) {
    case 1:
      return RecordingStatus.RECORDING;
    case 2:
      return RecordingStatus.PROCESSING;
    case 3:
      return RecordingStatus.COMPLETED;
    default:
      return RecordingStatus.RECORDING;
  }
}

export { TENCENT_MEETING_TYPE_RECURRING };
