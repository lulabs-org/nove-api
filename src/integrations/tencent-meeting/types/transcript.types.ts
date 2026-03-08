/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-03 08:55:09
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-09 00:54:56
 * @FilePath: /nove_api/src/integrations/tencent-meeting/types/transcript.types.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

export interface RecordingTranscriptWord {
  wid: string;
  start_time: number;
  end_time: number;
  text: string;
}

export interface RecordingTranscriptSentence {
  sid: string;
  start_time: number;
  end_time: number;
  words: RecordingTranscriptWord[];
}

export interface SpeakerInfo {
  userid: string;
  openId: string;
  username: string;
  ms_open_id: string;
  tm_xid?: string;
}

export interface RecordingTranscriptParagraph {
  pid: string;
  start_time: number;
  end_time: number;
  sentences: RecordingTranscriptSentence[];
  speaker_info: SpeakerInfo;
}

export interface RecordingTranscriptData {
  paragraphs: RecordingTranscriptParagraph[];
  keywords: string[];
  audio_detect: number;
}

export interface RecordingTranscriptResponse {
  minutes: RecordingTranscriptData;
  more: boolean;
  error_info?: {
    error_code: number;
    new_error_code?: number;
    message: string;
  };
}

export interface TranscriptResult {
  paragraphs: RecordingTranscriptParagraph[];
  uniqueSpeakerInfos: SpeakerInfo[];
  formattedText: string;
  keywords: string[];
}