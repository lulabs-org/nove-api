import { MeetingType, RecordingStatus, ProcessingStatus } from '@prisma/client';

/**
 * Constant representing a recurring meeting type in Tencent Meeting API.
 */
const TENCENT_MEETING_TYPE_RECURRING = 1;

/**
 * Computes a unique sub-meeting ID by combining the media start time's date
 * with the meeting's scheduled start time.
 *
 * @param mediaStartTimeMs - The actual media start time in milliseconds.
 * @param meetingStartTimeSec - The scheduled meeting start time in seconds.
 * @returns A computed sub-meeting ID as a string representing the combined timestamp in seconds.
 */
export function computeSubMeetingId(
  mediaStartTimeMs: number,
  meetingStartTimeSec: string,
): string {
  const combined = mergeDateTime(mediaStartTimeMs, meetingStartTimeSec)!;
  return String(Math.floor(combined.getTime() / 1000));
}

/**
 * Merges the date part from the media start time with the time part from the meeting scheduled time.
 * This is useful for aligning the actual recording date with the scheduled time, especially for recurring meetings.
 *
 * @param mediaStartTimeMs - The actual media start time in milliseconds.
 * @param meetingTimeSec - The scheduled meeting time in seconds.
 * @returns A new Date object combining the date and time, or undefined if meetingTimeSec is not provided.
 */
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

/**
 * Converts a Tencent Meeting type code into the internal Prisma MeetingType enum.
 *
 * @param meetingType - The meeting type code from Tencent Meeting API (e.g., 0, 1, 2, 4, 5).
 * @returns The corresponding Prisma MeetingType enum value.
 */
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

/**
 * Maps the recording overall state from Tencent Meeting API to the internal ProcessingStatus enum.
 *
 * @param state - The recording state from Tencent Meeting API.
 * @returns The corresponding internal ProcessingStatus enum value.
 */
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

/**
 * Maps an individual recording file's status from Tencent Meeting API to the internal RecordingStatus enum.
 *
 * @param state - The file status from Tencent Meeting API.
 * @returns The corresponding internal RecordingStatus enum value.
 */
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
