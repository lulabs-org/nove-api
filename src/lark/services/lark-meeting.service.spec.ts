import type { Queue } from 'bullmq';
import { PrismaService } from '@/prisma/prisma.service';
import { LarkMeetingService } from './lark-meeting.service';
import { MeetingEndedEventData } from '../types/lark-meeting.types';

describe('LarkMeetingService organization context', () => {
  it('stores orgId beside the event in the queue payload', async () => {
    const queue = { add: jest.fn().mockResolvedValue({ id: 'job-1' }) };
    const service = new LarkMeetingService(
      queue as unknown as Queue,
      {} as PrismaService,
    );
    const event = { event_id: 'event-1' } as MeetingEndedEventData;

    await service.enqueueMeetingEnded('org-1', event);

    expect(queue.add).toHaveBeenCalledWith(
      'meetingEnded',
      { orgId: 'org-1', event },
      {
        removeOnComplete: { age: 3600, count: 1000 },
        removeOnFail: { age: 86400, count: 1000 },
      },
    );
  });

  it('writes the explicitly supplied orgId during event handling', async () => {
    const prisma = {
      webhookLog: { create: jest.fn().mockResolvedValue({ id: 'log-1' }) },
      platformUser: { upsert: jest.fn() },
      meeting: { upsert: jest.fn().mockResolvedValue({ id: 'meeting-1' }) },
    };
    const service = new LarkMeetingService(
      { add: jest.fn() } as unknown as Queue,
      prisma as unknown as PrismaService,
    );
    const event = {
      event_type: 'vc.meeting.all_meeting_ended_v1',
      meeting: {
        id: 'external-meeting-1',
        topic: 'Meeting',
        meeting_no: '123456',
        start_time: '1000',
        end_time: '2000',
      },
    } as MeetingEndedEventData;

    await service.handleMeetingEnded(event, 'org-1');

    expect(prisma.meeting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        create: expect.objectContaining({ orgId: 'org-1' }),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        update: expect.objectContaining({ orgId: 'org-1' }),
      }),
    );
  });
});
