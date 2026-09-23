import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import * as Lark from '@larksuiteoapi/node-sdk';
import { LarkClient } from '../client/lark.client';
import { LarkMeetingService } from '../services/lark-meeting.service';
import { MeetingEndedEventData } from '../types/lark-meeting.types';
import { LarkEvent } from '../enums/lark-event.enum';

@Injectable()
export class LarkWsEventListener implements OnApplicationBootstrap {
  private readonly logger = new Logger(LarkWsEventListener.name);

  constructor(
    private readonly larkClient: LarkClient,
    private readonly larkMeetingService: LarkMeetingService,
  ) {}

  onApplicationBootstrap() {
    if (!this.larkClient.isConfigured || !this.larkClient.orgId) {
      this.logger.warn(
        'Lark credentials not configured, skipping WebSocket listener.',
      );
      return;
    }

    const orgId = this.larkClient.orgId;
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
