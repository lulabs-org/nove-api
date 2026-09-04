import { TMeetEventUtils } from './tmeet-event.utils';
import { MeetingType } from '@prisma/client';
import { MeetingType as TencentMeetingType } from '../enums/tmeet.enum';

describe('TMeetEventUtils', () => {
  describe('convertMeetingType', () => {
    it('should convert ONE_TIME to MeetingType.ONE_TIME', () => {
      const result = TMeetEventUtils.convertMeetingType(
        TencentMeetingType.ONE_TIME,
      );
      expect(result).toBe(MeetingType.ONE_TIME);
    });

    it('should convert RECURRING to MeetingType.RECURRING', () => {
      const result = TMeetEventUtils.convertMeetingType(
        TencentMeetingType.RECURRING,
      );
      expect(result).toBe(MeetingType.RECURRING);
    });

    it('should convert WECHAT_EXCLUSIVE to MeetingType.INSTANT', () => {
      const result = TMeetEventUtils.convertMeetingType(
        TencentMeetingType.WECHAT_EXCLUSIVE,
      );
      expect(result).toBe(MeetingType.INSTANT);
    });

    it('should convert ROOMS_SCREEN_SHARE to MeetingType.INSTANT', () => {
      const result = TMeetEventUtils.convertMeetingType(
        TencentMeetingType.ROOMS_SCREEN_SHARE,
      );
      expect(result).toBe(MeetingType.INSTANT);
    });

    it('should convert PERSONAL_MEETING_ID to MeetingType.SCHEDULED', () => {
      const result = TMeetEventUtils.convertMeetingType(
        TencentMeetingType.PERSONAL_MEETING_ID,
      );
      expect(result).toBe(MeetingType.SCHEDULED);
    });

    it('should default unknown types to MeetingType.SCHEDULED', () => {
      const result = TMeetEventUtils.convertMeetingType(999);
      expect(result).toBe(MeetingType.SCHEDULED);
    });
  });
});
