import { PrismaClient } from '@prisma/client';
import {
  RecordingTranscriptResponse,
  RecordingTranscriptParagraph,
  RecordingTranscriptSentence,
} from '@/integrations/tencent-meeting/types';

export type PrismaTransaction = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

export interface CreateTranscriptResult {
  transcript: {
    id: string;
  };
  paragraphsCount: number;
  duration: number;
}

export interface ParagraphData {
  paragraph: RecordingTranscriptParagraph;
  index: string;
}

export interface SentenceData {
  sentence: RecordingTranscriptSentence;
  paragraphId: string;
}

export interface CreateTranscriptInput {
  recordFileId: string;
  transcriptResponse: RecordingTranscriptResponse;
  participants: Array<{ uuid: string; user_name: string }>;
  meetingId?: string;
  subMeetingId?: string;
}
