/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-02-15 21:10:16
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-17 14:15:24
 * @FilePath: /nove_api/src/integrations/tencent-meeting/types/meeting-detail.types.ts
 * @Description: 
 * 
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved. 
 */

export interface User {
  userid: string;
  operator_id: string;
  operator_id_type: number;
}

export interface Setting {
  mute_enable_join?: boolean;
  allow_unmute_self: boolean;
  allow_in_before_host: boolean;
  auto_in_waiting_room: boolean;
  allow_screen_shared_watermark: boolean;
  water_mark_type?: number;
  only_allow_enterprise_user_join: boolean;
  auto_record_type?: string;
  participant_join_auto_record?: boolean;
  enable_host_pause_auto_record?: boolean;
  only_enterprise_user_allowed?: boolean;
  auto_asr?: boolean;
  allow_multi_device?: boolean;
  open_asr_view?: number;
  change_nickname?: number;
  only_user_join_type: number;
  allow_dev_switch?: boolean;
  mute_enable_type_join: number;
  audio_watermark: boolean;
  play_ivr_on_leave?: boolean;
}

export interface RecurringRule {
  recurring_type: number;
  until_type: number;
  until_date?: number;
  until_count?: number;
  customized_recurring_type?: number;
  customized_recurring_step?: number;
  customized_recurring_days?: number;
}

export interface SubMeeting {
  sub_meeting_id: string;
  status: number;
  start_time: number;
  end_time: number;
}

export interface LiveWatermark {
  watermark_opt: number;
}

export interface LiveConfig {
  live_subject: string;
  live_summary: string;
  live_password: string;
  enable_live_im: boolean;
  enable_live_replay: boolean;
  live_addr: string;
  live_watermark?: LiveWatermark;
}

export interface Guest {
  area: string;
  phone_number: string;
  guest_name: string;
}

export interface MeetingDetailResponse {
  meeting_number: number;
  meeting_info_list: Array<{
    subject: string;
    meeting_id: string;
    meeting_code: string;
    password?: string;
    status: string;
    type?: number;
    join_url: string;
    hosts?: User[];
    participants?: User[];
    start_time: string;
    end_time: string;
    settings: Setting;
    meeting_type: number;
    recurring_rule?: RecurringRule;
    sub_meetings?: SubMeeting[];
    has_more_sub_meetings?: number;
    remain_sub_meetings?: number;
    current_sub_meeting_id?: string;
    enable_live?: boolean;
    enable_doc_upload_permission?: boolean;
    has_vote?: boolean;
    current_hosts?: User[];
    location?: string;
    enable_enroll?: boolean;
    enable_host_key?: boolean;
    time_zone?: string;
    sync_to_wework?: boolean;
    disable_invitation?: number;
    live_config?: LiveConfig;
    guests?: Guest[];
    host_key?: string;
  }>;
}
