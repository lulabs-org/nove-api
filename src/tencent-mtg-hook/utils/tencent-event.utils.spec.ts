/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-19 19:25:35
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-12-31 11:37:02
 * @FilePath: /lulab_backend/src/hook-tencent-mtg/utils/tencent-event.utils.spec.ts
 * @Description:
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import { TencentEventUtils } from './tencent-event.utils';
import { MeetingType } from '@prisma/client';
import { TencentMeetingType } from '../enums/tencent-base.enum';

describe('TencentEventUtils', () => {
  describe('convertMeetingType', () => {
    it('should convert ONE_TIME to MeetingType.ONE_TIME', () => {
      const result = TencentEventUtils.convertMeetingType(
        TencentMeetingType.ONE_TIME,
      );
      expect(result).toBe(MeetingType.ONE_TIME);
    });

    it('should convert RECURRING to MeetingType.RECURRING', () => {
      const result = TencentEventUtils.convertMeetingType(
        TencentMeetingType.RECURRING,
      );
      expect(result).toBe(MeetingType.RECURRING);
    });

    it('should convert WECHAT_EXCLUSIVE to MeetingType.INSTANT', () => {
      const result = TencentEventUtils.convertMeetingType(
        TencentMeetingType.WECHAT_EXCLUSIVE,
      );
      expect(result).toBe(MeetingType.INSTANT);
    });

    it('should convert ROOMS_SCREEN_SHARE to MeetingType.INSTANT', () => {
      const result = TencentEventUtils.convertMeetingType(
        TencentMeetingType.ROOMS_SCREEN_SHARE,
      );
      expect(result).toBe(MeetingType.INSTANT);
    });

    it('should convert PERSONAL_MEETING_ID to MeetingType.SCHEDULED', () => {
      const result = TencentEventUtils.convertMeetingType(
        TencentMeetingType.PERSONAL_MEETING_ID,
      );
      expect(result).toBe(MeetingType.SCHEDULED);
    });

    it('should convert unknown types to MeetingType.SCHEDULED', () => {
      const result = TencentEventUtils.convertMeetingType(999);
      expect(result).toBe(MeetingType.SCHEDULED);
    });
  });
});
