/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-11-23 01:23:27
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-11-23 02:08:36
 * @FilePath: /lulab_backend/src/lark-meeting/types/lark-meeting.types.ts
 * @Description:
 *  *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

export interface MeetingEndedEventData {
  schema: string;
  event_id: string;
  token: string;
  create_time: string;
  event_type: string;
  tenant_key: string;
  app_id: string;
  meeting: {
    calendar_event_id: string;
    end_time: string;
    host_user: {
      id: {
        open_id: string;
        union_id: string;
        user_id: string;
      };
      user_role: number;
      user_type: number;
    };
    id: string;
    meeting_no: string;
    meeting_source: number;
    owner: {
      id: {
        open_id: string;
        union_id: string;
        user_id: string;
      };
      user_role: number;
      user_type: number;
    };
    security_setting?: {
      has_set_security_contacts_and_group: boolean;
      security_level: number;
    };
    start_time: string;
    topic: string;
  };
  operator: {
    id: {
      open_id: string;
      union_id: string;
      user_id: string;
    };
    user_role: number;
    user_type: number;
  };
}
