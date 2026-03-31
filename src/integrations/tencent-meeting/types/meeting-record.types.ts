export interface RecordFile {
  record_file_id: string;
  record_start_time: number;
  record_end_time: number;
  record_size: number;
  sharing_state: number;
  sharing_url?: string;
  required_same_corp?: boolean;
  required_participant?: boolean;
  password?: string;
  sharing_expire?: number;
  view_address?: string;
  allow_download?: boolean;
  download_address?: string;
}

export interface RecordMeeting {
  meeting_record_id: string;
  meeting_id: string;
  meeting_code: string;
  userid: string;
  media_start_time: number;
  subject: string;
  state: number;
  record_files?: RecordFile[];
}

export interface RecordMeetingsResponse {
  total_count: number;
  current_size: number;
  current_page: number;
  total_page: number;
  record_meetings?: RecordMeeting[];
  error_info?: {
    error_code: number;
    new_error_code?: number;
    message: string;
  };
}
