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
  NewTranscriptParagraph,
} from './recording-transcript.types';

export interface RecordingData {
  /** 会议ID (meeting_id) */
  meetid?: string;
  /** 会议主题 (meeting_info.subject) */
  subject?: string;
  /** 子会议ID (sub_meeting_id) */
  subid?: string;
  /** 会议创建者的用户ID (creator.userid) */
  cid?: string;
  /** 会议开始时间（时间戳） */
  start_time?: number;
  /** 会议结束时间（时间戳） */
  end_time?: number;
  /**
   * 经过去重处理后的参会者列表（用于生成有序的全局时间轴和统计）
   * 确保顺序反映实际发言时间，用于关联发言片段和生成准确的发言时间轴
   */
  deduplicated?: ParticipantDetail[];
  /**
   * 未经去重处理的参会者列表（用于记录所有进出记录，可能包含重复进出者）
   * 顺序不保证严格反映发言时间，主要用于简单的日志记录和进出事件统计
   */
  participants?: ParticipantDetail[];
  files?: Array<{
    /** 文件ID */
    id: string;
    /** 待办事项 */
    todo?: string;
    /** 完整的会议总结 */
    fullsummary?: string;
    /** AI 生成的会议纪要 */
    aiminutes?: string;
    /** AI 生成的格式化文本 */
    formattedtext?: string;
    /** 说话人列表 */
    speakerlist?: NewSpeakerInfo[];
    /** 会议纪要段落 */
    paragraphs?: NewTranscriptParagraph[];
  }>;
}
