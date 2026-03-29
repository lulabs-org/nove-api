/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-28
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-28 17:46:07
 * @FilePath: /nove_api/src/tencent-mtg-hook/types/recording-data.types.ts
 * @Description: 录制数据类型定义
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { ParticipantDetail } from '@/integrations/tencent-meeting/types';
import {
  NewSpeakerInfo,
  NewRecordingTranscriptParagraph,
} from './recording-transcript.types';

export interface RecordingData {
  meetid?: string;
  subject?: string;
  subid?: string;
  cid?: string;
  start_time?: number;
  end_time?: number;
  deduplicated?: ParticipantDetail[];
  participants?: ParticipantDetail[];
  files?: Array<{
    id: string;
    todo?: string;
    fullsummary?: string;
    aiminutes?: string;
    formattedtext?: string;
    speakerlist?: NewSpeakerInfo[];
    paragraphs?: NewRecordingTranscriptParagraph[];
  }>;
}
