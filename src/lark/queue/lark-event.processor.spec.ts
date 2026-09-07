import type { Job } from 'bullmq';
import { LarkMeetingService } from '../services/lark-meeting.service';
import { MeetingEndedEventData } from '../types/lark-meeting.types';
import { LarkEventProcessor } from './lark-event.processor';
import { SingleOrgContextService } from '@/admin/system-config/services';

describe('LarkEventProcessor organization context', () => {
  it('forwards the queued orgId to the meeting handler', async () => {
    const meetingService = {
      handleMeetingEnded: jest.fn().mockResolvedValue(undefined),
    };
    const processor = new LarkEventProcessor(
      meetingService as unknown as LarkMeetingService,
      { getOrgId: () => 'fallback-org' } as SingleOrgContextService,
    );
    const event = { event_id: 'event-1' } as MeetingEndedEventData;

    await expect(
      processor.process({
        name: 'meetingEnded',
        data: { orgId: 'org-1', event },
      } as Job<{ orgId: string; event: MeetingEndedEventData }>),
    ).resolves.toEqual({ ok: true });
    expect(meetingService.handleMeetingEnded).toHaveBeenCalledWith(
      event,
      'org-1',
    );
  });

  it('uses the single-org context for legacy queue payloads', async () => {
    const meetingService = {
      handleMeetingEnded: jest.fn().mockResolvedValue(undefined),
    };
    const processor = new LarkEventProcessor(
      meetingService as unknown as LarkMeetingService,
      { getOrgId: () => 'fallback-org' } as SingleOrgContextService,
    );
    const event = { event_id: 'event-1' } as MeetingEndedEventData;

    await processor.process({
      id: 'legacy-job',
      name: 'meetingEnded',
      data: event,
    } as Job<MeetingEndedEventData>);

    expect(meetingService.handleMeetingEnded).toHaveBeenCalledWith(
      event,
      'fallback-org',
    );
  });
});
