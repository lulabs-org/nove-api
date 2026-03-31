export interface User {
  userid: string;
  user_name: string;
}

export interface Setting {
  allow_in_before_host?: boolean;
  allow_screen_shared?: boolean;
  allow_unmute_self?: boolean;
  allow_unmute_by_host?: boolean;
  auto_record?: boolean;
  participant_join_mute?: number;
  enable_host_pause_all_video?: boolean;
  enable_pause_all_video?: boolean;
  enable_enter_mute?: boolean;
  enable_waiting_room?: boolean;
}

export interface RecurringRule {
  recurring_type: number;
  until_type: number;
  until_count?: number;
  until_date?: string;
  day_intervals?: string;
  week_days?: string;
  month_day?: number;
}

export interface SubMeeting {
  sub_meeting_id: string;
  status: string;
  start_time: string;
  end_time: string;
}

export interface LiveConfig {
  enable_live: boolean;
  live_subject?: string;
  live_summary?: string;
  enable_live_password: boolean;
  live_password?: string;
  enable_live_im: boolean;
  enable_live_share: boolean;
  enable_live_replay: boolean;
  allow_participant_start_live: boolean;
}

export interface MeetingDetailResponse {
  meeting_number?: number;
  meeting_info_list?: Array<{
    subject: string;
    meeting_id: string;
    meeting_code: string;
    password?: string;
    need_password?: boolean;
    status: string;
    type: number;
    join_url?: string;
    hosts?: User[];
    current_hosts?: User[];
    current_co_hosts?: User[];
    participants?: User[];
    start_time: string;
    end_time: string;
    settings?: Setting;
    meeting_type: number;
    recurring_rule?: RecurringRule;
    sub_meetings?: SubMeeting[];
    has_more_sub_meeting?: number;
    remain_sub_meetings?: number;
    current_sub_meeting_id?: string;
    enable_live?: boolean;
    live_config?: LiveConfig;
    enable_doc_upload_permission?: boolean;
    guest_modify_permission?: boolean;
    allow_anonymous_user?: boolean;
    allow_anonymous_start_meeting?: boolean;
  }>;
  meeting_id?: string;
  meeting_code?: string;
  subject?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  creator?: User;
  meeting_type?: number;
  sub_meeting_id?: string;
  password?: string;
  need_password?: boolean;
  status?: string;
  type?: number;
  join_url?: string;
  hosts?: User[];
  current_hosts?: User[];
  current_co_hosts?: User[];
  participants?: User[];
  settings?: Setting;
  recurring_rule?: RecurringRule;
  sub_meetings?: SubMeeting[];
  has_more_sub_meeting?: number;
  remain_sub_meetings?: number;
  current_sub_meeting_id?: string;
  enable_live?: boolean;
  live_config?: LiveConfig;
  enable_doc_upload_permission?: boolean;
  guest_modify_permission?: boolean;
  allow_anonymous_user?: boolean;
  allow_anonymous_start_meeting?: boolean;
  error_info?: {
    error_code: number;
    new_error_code?: number;
    message: string;
  };
}
