/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-09 14:04:49
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-09 14:04:53
 * @FilePath: /nove_api/src/integrations/tencent-meeting/types/base.types.ts
 * @Description: 
 * 
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved. 
 */

import { MeetingParticipantDetail } from '@/integrations/tencent-meeting/types';

export interface MeetingParticipantsResult {
  uniqueParticipants: MeetingParticipantDetail[];
  allParticipants: MeetingParticipantDetail[];
}