export interface MeetingMinute {
  minute: string;
  todo: string;
}

export interface TopicTime {
  pid: string;
  start_time: string;
  end_time: string;
}

export interface AiTopic {
  topic_id: string;
  topic_name: string;
  topic_time: TopicTime[];
}

export interface SmartTopicsResponse {
  ai_topic_list: AiTopic[];
  error_info?: {
    error_code: number;
    new_error_code?: number;
    message: string;
  };
}

export interface SmartFullSummaryResponse {
  ai_summary: string;
  error_info?: {
    error_code: number;
    new_error_code?: number;
    message: string;
  };
}

export interface SmartMeetingMinutes {
  minute: string;
  todo: string;
}

export interface SmartMeetingMinutesResponse {
  meeting_minute: SmartMeetingMinutes;
  error_info?: {
    error_code: number;
    new_error_code?: number;
    message: string;
  };
}
