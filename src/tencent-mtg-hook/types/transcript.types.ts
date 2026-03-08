/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-08 23:49:04
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-09 00:54:46
 * @FilePath: /nove_api/src/tencent-mtg-hook/types/transcript.types.ts
 * @Description: 
 * 
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved. 
 */
import { PrismaClient } from '@prisma/client';
import {
  RecordingTranscriptResponse,
  RecordingTranscriptParagraph,
  RecordingTranscriptSentence,
  SpeakerInfo,
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
