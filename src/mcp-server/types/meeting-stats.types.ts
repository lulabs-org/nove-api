import type {
  Meeting,
  MeetingParticipant,
  MeetingRecording,
} from '@prisma/client';

export type MeetingDetailsResult = Meeting & {
  createdBy: {
    id: string;
    displayName: string | null;
    email: string | null;
  } | null;
  host: { id: string; displayName: string | null; email: string | null } | null;
  participants: Array<
    MeetingParticipant & {
      ptUser: {
        id: string;
        displayName: string | null;
        email: string | null;
      } | null;
    }
  >;
  recordings: Array<
    MeetingRecording & {
      files: Array<{
        durationMs: bigint | null;
      }>;
    }
  >;
};
