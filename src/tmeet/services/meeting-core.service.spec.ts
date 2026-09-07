import { Platform } from '@prisma/client';
import { MinuteRepository } from '@/minute/repositories';
import { MeetingRepository } from '@/meeting/repositories/meeting.repository';
import { PlatformUserRepository } from '@/user-platform/repositories/platform-user.repository';
import { TMeetApiService } from '../client';
import { StartedPayload } from '../types';
import { TMeetMeetingCoreService } from './meeting-core.service';

describe('TMeetMeetingCoreService organization context', () => {
  it('writes the explicitly supplied orgId during webhook upsert', async () => {
    const platformUserRepository = {
      upsert: jest.fn().mockResolvedValue({ id: 'creator-1' }),
    };
    const meetingRepository = {
      upsert: jest.fn().mockResolvedValue({ id: 'meeting-1' }),
    };
    const service = new TMeetMeetingCoreService(
      platformUserRepository as unknown as PlatformUserRepository,
      meetingRepository as unknown as MeetingRepository,
      {} as MinuteRepository,
      {} as TMeetApiService,
    );
    const payload = {
      operate_time: Date.now(),
      operator: {
        userid: 'operator-1',
        uuid: 'operator-uuid',
        user_name: 'Operator',
        instance_id: '1',
        ms_open_id: 'operator-open-id',
      },
      meeting_info: {
        meeting_id: 'external-meeting-1',
        sub_meeting_id: '__ROOT__',
        meeting_code: '123456',
        subject: 'Meeting',
        meeting_type: 0,
        start_time: 1000,
        end_time: 2000,
        creator: {
          userid: 'creator-1',
          uuid: 'creator-uuid',
          user_name: 'Creator',
          instance_id: '1',
          ms_open_id: 'creator-open-id',
        },
      },
    } as StartedPayload;

    await service.upsertMeetingFromWebhook(payload, 'meeting.started', 'org-1');

    expect(meetingRepository.upsert).toHaveBeenCalledWith(
      Platform.TENCENT_MEETING,
      'external-meeting-1',
      '__ROOT__',
      expect.objectContaining({ orgId: 'org-1' }),
    );
  });
});
