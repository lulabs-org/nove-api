import type { Job } from 'bullmq';
import { LarkMeetingService } from '../services/lark-meeting.service';
import {
  LarkMeetingEndedJobData,
  MeetingEndedEventData,
} from '../types/lark-meeting.types';
import { LarkEventProcessor } from './lark-event.processor';

describe('LarkEventProcessor organization context', () => {
  it('forwards the queued orgId to the meeting handler', async () => {
    const meetingService = {
      handleMeetingEnded: jest.fn().mockResolvedValue(undefined),
    };
    const processor = new LarkEventProcessor(
      meetingService as unknown as LarkMeetingService,
    );
    const event = { event_id: 'event-1' } as MeetingEndedEventData;

    await expect(
      processor.process({
        name: 'meetingEnded',
        data: { orgId: 'org-1', event },
      } as Job<LarkMeetingEndedJobData>),
    ).resolves.toEqual({ ok: true });
    expect(meetingService.handleMeetingEnded).toHaveBeenCalledWith(
      event,
      'org-1',
    );
  });
});
