/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-03 08:35:10
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-03 08:35:12
 * @FilePath: /lulab_backend/src/integrations/tencent-meeting/types/recording.types.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
export interface TencentRecordingFile {
  record_file_id: string;
}

export interface MeetingSummary {
  download_address: string;
  file_type: string;
}

export interface RecordingDetail {
  meeting_id: string;
  meeting_code: string;
  record_file_id: string;
  view_address?: string;
  download_address?: string;
  download_address_file_type?: string;
  audio_address?: string;
  audio_address_file_type?: string;
  meeting_summary?: MeetingSummary[];
  ai_meeting_transcripts?: MeetingSummary[];
  ai_minutes?: MeetingSummary[];
  record_name?: string;
  start_time?: string;
  end_time?: string;
  meeting_record_name?: string;
}
