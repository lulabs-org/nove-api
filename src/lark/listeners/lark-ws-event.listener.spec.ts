import * as Lark from '@larksuiteoapi/node-sdk';
import { Test } from '@nestjs/testing';
import { LarkWsEventListener } from './lark-ws-event.listener';
import { LarkClient } from '../client/lark.client';
import { LarkMeetingService } from '../services/lark-meeting.service';
import { LarkEvent } from '../enums/lark-event.enum';
import { MeetingEndedEventData } from '../types/lark-meeting.types';

describe('LarkWsEventListener', () => {
  let listener: LarkWsEventListener;
  let larkClient: {
    isConfigured: boolean;
    orgId: string | null;
    wsClient: { start: jest.Mock };
  };
  let meetingService: { enqueueMeetingEnded: jest.Mock };

  beforeEach(() => {
    larkClient = {
      isConfigured: true,
      orgId: 'test-org-id',
      wsClient: {
        start: jest.fn(),
      },
    };
    meetingService = {
      enqueueMeetingEnded: jest.fn().mockResolvedValue(undefined),
    };

    listener = new LarkWsEventListener(
      larkClient as unknown as LarkClient,
      meetingService as unknown as LarkMeetingService,
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

    listener.onApplicationBootstrap();

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

    listener.onApplicationBootstrap();

    const mockEventData = {
      event_id: 'evt-err',
    } as MeetingEndedEventData;

    await expect(
      registeredHandlers[LarkEvent.VC_MEETING_ALL_ENDED_V1](mockEventData),
    ).resolves.not.toThrow();

    registerSpy.mockRestore();
  });

  it('skips wsClient start if larkClient is not configured or orgId is missing', () => {
    larkClient.isConfigured = false;
    listener.onApplicationBootstrap();
    expect(larkClient.wsClient.start).not.toHaveBeenCalled();

    larkClient.isConfigured = true;
    larkClient.orgId = null;
    listener.onApplicationBootstrap();
    expect(larkClient.wsClient.start).not.toHaveBeenCalled();
  });

  it('waits for asynchronous client configuration before starting WebSocket', async () => {
    larkClient.isConfigured = false;
    larkClient.orgId = null;
    const clientWithInit = Object.assign(larkClient, {
      async onModuleInit() {
        await Promise.resolve();
        larkClient.isConfigured = true;
        larkClient.orgId = 'test-org-id';
      },
    });
    const module = await Test.createTestingModule({
      providers: [
        { provide: LarkClient, useValue: clientWithInit },
        { provide: LarkMeetingService, useValue: meetingService },
        LarkWsEventListener,
      ],
    }).compile();

    try {
      await module.init();
      expect(larkClient.wsClient.start).toHaveBeenCalledTimes(1);
    } finally {
      await module.close();
    }
  });
});
