import { EventHandlerFactory } from '../handlers/factories/event-handler.factory';
import { MeetingEvent } from '../types';
import { TMeetEventHandlerService } from './event-handler.service';

describe('TMeetEventHandlerService organization context', () => {
  it('passes orgId to every payload handler', async () => {
    const handler = { handle: jest.fn().mockResolvedValue(undefined) };
    const factory = {
      isEventSupported: jest.fn().mockReturnValue(true),
      getHandler: jest.fn().mockReturnValue(handler),
    };
    const service = new TMeetEventHandlerService(
      factory as unknown as EventHandlerFactory,
    );
    const payload = { operate_time: Date.now() };
    const event = {
      event: 'meeting.started',
      trace_id: 'trace-1',
      payload: [payload],
    } as unknown as MeetingEvent;

    await service.handleEvent(event, 'org-1');

    expect(handler.handle).toHaveBeenCalledWith(payload, 0, 'org-1');
  });
});
