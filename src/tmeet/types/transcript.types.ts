import { PrismaClient } from '@prisma/client';
import { NewSpeakerInfo } from './speaker.types';

export interface TranscriptWord {
  wid: string;
  start_time: number;
  end_time: number;
  text: string;
}

export interface TranscriptSentence {
  sid: string;
  start_time: number;
  end_time: number;
  words: TranscriptWord[];
}

export interface SpeakerInfo {
  userid: string;
  openId: string;
  username: string;
  ms_open_id: string;
  tm_xid?: string;
}

export interface TranscriptParagraph {
  pid: string;
  start_time: number;
  end_time: number;
  sentences: TranscriptSentence[];
  speaker_info: SpeakerInfo;
}

export interface TranscriptData {
  paragraphs: TranscriptParagraph[];
  keywords: string[];
  audio_detect: number;
}

export interface TranscriptResponse {
  minutes: TranscriptData;
  more: boolean;
  error_info?: {
    error_code: number;
    new_error_code?: number;
    message: string;
  };
}

export interface TranscriptResult {
  paragraphs: TranscriptParagraph[];
  uniqueSpeakerInfos: SpeakerInfo[];
  formattedText: string;
  keywords: string[];
}

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

export interface CreateTranscriptInput {
  recordFileId: string;
  transcriptResponse: TranscriptResponse;
  participants: Array<{ uuid: string; user_name: string }>;
  meetingId?: string;
  subMeetingId?: string;
}

export interface NewTranscriptParagraph {
  pid: string;
  start_time: number;
  end_time: number;
  sentences: TranscriptSentence[];
  speaker_info: NewSpeakerInfo;
}
