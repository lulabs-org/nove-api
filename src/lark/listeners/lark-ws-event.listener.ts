import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as Lark from '@larksuiteoapi/node-sdk';
import { LarkClient } from '../client/lark.client';
import { LarkMeetingService } from '../services/lark-meeting.service';
import { MeetingEndedEventData } from '../types/lark-meeting.types';
import { LarkEvent } from '../enums/lark-event.enum';
import { SingleOrgContextService } from '@/admin/org';

@Injectable()
export class LarkWsEventListener implements OnModuleInit {
  private readonly logger = new Logger(LarkWsEventListener.name);

  constructor(
    private readonly larkClient: LarkClient,
    private readonly larkMeetingService: LarkMeetingService,
    private readonly orgContext: SingleOrgContextService,
  ) {}

  onModuleInit() {
    const orgId = this.orgContext.getOrgId();
    const dispatcher = new Lark.EventDispatcher({}).register({
      [LarkEvent.VC_MEETING_ALL_ENDED_V1]: async (
        data: MeetingEndedEventData,
      ) => {
        try {
          await this.larkMeetingService.enqueueMeetingEnded(orgId, data);
        } catch (err) {
          this.logger.error(
            `Failed to enqueue meeting ended event: ${data?.event_id ?? 'unknown'}`,
            err,
          );
        }
      },
      '*': () => undefined,
    });
    void this.larkClient.wsClient.start({ eventDispatcher: dispatcher });
  }
}
