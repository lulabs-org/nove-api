export interface MeetingParticipantDetail {
  userid: string;
  uuid: string;
  user_name: string;
  phone: string;
  join_time: string;
  left_time: string;
  instanceid: number;
  user_role: number;
  ip: string;
  location: string;
  link_type: string;
  join_type: number;
  net: string;
  app_version: string;
  audio_state: boolean;
  video_state: boolean;
  screen_shared_state: boolean;
  webinar_member_role: number;
  ms_open_id: string;
  open_id: string;
  customer_data: string;
  is_enterprise_user: boolean;
  tm_corpid: string;
  avatar_url: string;
}

export interface MeetingParticipantsResponse {
  meeting_id: string;
  meeting_code: string;
  subject: string;
  schedule_start_time: string;
  schedule_end_time: string;
  participants: MeetingParticipantDetail[];
  has_remaining: boolean;
  next_pos: number;
  total_count: number;
  error_info?: {
    error_code: number;
    new_error_code?: number;
    message: string;
  };
}
