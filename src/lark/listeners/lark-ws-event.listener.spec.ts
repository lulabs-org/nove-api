import * as Lark from '@larksuiteoapi/node-sdk';
import { LarkWsEventListener } from './lark-ws-event.listener';
import { LarkClient } from '../client/lark.client';
import { LarkMeetingService } from '../services/lark-meeting.service';
import { SingleOrgContextService } from '@/admin/integrations';
import { LarkEvent } from '../enums/lark-event.enum';
import { MeetingEndedEventData } from '../types/lark-meeting.types';

describe('LarkWsEventListener', () => {
  let listener: LarkWsEventListener;
  let larkClient: { wsClient: { start: jest.Mock } };
  let meetingService: { enqueueMeetingEnded: jest.Mock };
  let orgContext: { getOrgId: jest.Mock };

  beforeEach(() => {
    larkClient = {
      wsClient: {
        start: jest.fn(),
      },
    };
    meetingService = {
      enqueueMeetingEnded: jest.fn().mockResolvedValue(undefined),
    };
    orgContext = {
      getOrgId: jest.fn().mockReturnValue('test-org-id'),
    };

    listener = new LarkWsEventListener(
      larkClient as unknown as LarkClient,
      meetingService as unknown as LarkMeetingService,
      orgContext as unknown as SingleOrgContextService,
    );
  });

  it('registers event handler and starts wsClient on init', async () => {
    let registeredHandlers: Record<string, (data: unknown) => unknown> = {};
    const registerSpy = jest
      .spyOn(Lark.EventDispatcher.prototype, 'register')
      .mockImplementation((handlers) => {
        registeredHandlers = handlers as Record<
          string,
          (data: unknown) => unknown
        >;
        return {} as Lark.EventDispatcher;
      });

    listener.onModuleInit();

    expect(orgContext.getOrgId).toHaveBeenCalled();
    expect(larkClient.wsClient.start).toHaveBeenCalled();
    expect(registeredHandlers[LarkEvent.VC_MEETING_ALL_ENDED_V1]).toBeDefined();

    // Trigger meeting ended event handler
    const mockEventData = {
      event_id: 'evt-123',
      meeting: { id: 'm-1' },
    } as MeetingEndedEventData;

    await registeredHandlers[LarkEvent.VC_MEETING_ALL_ENDED_V1](mockEventData);

    expect(meetingService.enqueueMeetingEnded).toHaveBeenCalledWith(
      'test-org-id',
      mockEventData,
    );

    registerSpy.mockRestore();
  });

  it('handles enqueue errors gracefully when meeting ended event fails', async () => {
    let registeredHandlers: Record<string, (data: unknown) => unknown> = {};
    const registerSpy = jest
      .spyOn(Lark.EventDispatcher.prototype, 'register')
      .mockImplementation((handlers) => {
        registeredHandlers = handlers as Record<
          string,
          (data: unknown) => unknown
        >;
        return {} as Lark.EventDispatcher;
      });

    meetingService.enqueueMeetingEnded.mockRejectedValueOnce(
      new Error('Redis connection failed'),
    );

    listener.onModuleInit();

    const mockEventData = {
      event_id: 'evt-err',
    } as MeetingEndedEventData;

    await expect(
      registeredHandlers[LarkEvent.VC_MEETING_ALL_ENDED_V1](mockEventData),
    ).resolves.not.toThrow();

    registerSpy.mockRestore();
  });
});
