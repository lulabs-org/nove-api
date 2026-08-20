import type {
  Meeting,
  MeetingParticipant,
  Minute,
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
  minutes: Array<
    Minute & {
      files: Array<{
        durationMs: bigint | null;
      }>;
    }
  >;
};
