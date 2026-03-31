/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-04 03:40:29
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-04 04:01:36
 * @FilePath: /lulab_backend/src/hook-tencent-mtg/types/speaker.types.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { RecordingTranscriptSentence } from '@/integrations/tencent-meeting/types';
export interface NewSpeakerInfo {
  userid: string;
  openId: string;
  username: string;
  ms_open_id: string;
  tm_xid?: string;
  uuid?: string;
  phone?: string;
  instanceid?: number;
  user_role?: number;
  ip?: string;
  location?: string;
  link_type?: string;
  net?: string;
  app_version?: string;
  audio_state?: boolean;
  video_state?: boolean;
  screen_shared_state?: boolean;
  webinar_member_role?: number;
  customer_data?: string;
  is_enterprise_user?: boolean;
  tm_corpid?: string;
  avatar_url?: string;
}

export interface NewRecordingTranscriptParagraph {
  pid: string;
  start_time: number;
  end_time: number;
  sentences: RecordingTranscriptSentence[];
  speaker_info: NewSpeakerInfo;
}
