/* eslint-disable @typescript-eslint/unbound-method */
/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-23 04:23:42
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-23 20:34:45
 * @FilePath: /nove_api/src/tencent-mtg/handlers/events/meeting-participant-joined.handler.spec.ts
 * @Description:
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { MeetingParticipantJoinedHandler } from './meeting-participant-joined.handler';
import { TMeetMeetingCoreService } from '../../services/meeting-core.service';
import { ParticipantJoinedPayload } from '../../types';

describe('MeetingParticipantJoinedHandler', () => {
  let handler: MeetingParticipantJoinedHandler;
  let meetingCoreSvc: jest.Mocked<TMeetMeetingCoreService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeetingParticipantJoinedHandler,
        {
          provide: TMeetMeetingCoreService,
          useValue: {
            upsertPtUser: jest.fn().mockResolvedValue({ id: 'user-1' }),
          },
        },
      ],
    }).compile();

    handler = module.get<MeetingParticipantJoinedHandler>(
      MeetingParticipantJoinedHandler,
    );
    meetingCoreSvc = module.get(TMeetMeetingCoreService);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  it('should support meeting.participant-joined event', () => {
    expect(handler.supports('meeting.participant-joined')).toBe(true);
    expect(handler.supports('meeting.start')).toBe(false);
  });

  it('should handle meeting participant joined event', async () => {
    const payload: ParticipantJoinedPayload = {
      operate_time: Date.now(),
      operator: {
        userid: 'operator123',
        uuid: 'operator-uuid',
        user_name: 'Test Operator',
        instance_id: '1',
        ms_open_id: 'operator-ms-open-id',
      },
      meeting_info: {
        meeting_id: 'meeting123',
        sub_meeting_id: 'sub123',
        meeting_code: '123456',
        subject: 'Test Meeting',
        start_time: Date.now() / 1000,
        end_time: Date.now() / 1000 + 3600,
        meeting_type: 0,
        creator: {
          userid: 'creator123',
          uuid: 'creator-uuid',
          user_name: 'Test Creator',
          instance_id: '1',
          ms_open_id: 'creator-ms-open-id',
        },
      },
    };

    await handler.handle(payload, 1);

    expect(meetingCoreSvc.upsertPtUser).toHaveBeenCalledTimes(1);
    expect(meetingCoreSvc.upsertPtUser).toHaveBeenCalledWith(payload.operator);
  });

  it('should handle missing meeting_info gracefully', async () => {
    const payload = {
      operate_time: Date.now(),
      operator: {
        userid: 'operator123',
        uuid: 'operator-uuid',
        user_name: 'Test Operator',
        instance_id: '1',
        ms_open_id: 'operator-ms-open-id',
      },
    } as ParticipantJoinedPayload;

    await handler.handle(payload, 1);

    expect(meetingCoreSvc.upsertPtUser).not.toHaveBeenCalled();
  });

  it('should handle missing operator gracefully', async () => {
    const payload = {
      operate_time: Date.now(),
      meeting_info: {
        meeting_id: 'meeting123',
        sub_meeting_id: 'sub123',
        meeting_code: '123456',
        subject: 'Test Meeting',
        start_time: Date.now() / 1000,
        end_time: Date.now() / 1000 + 3600,
        meeting_type: 0,
        creator: {
          userid: 'creator123',
          uuid: 'creator-uuid',
          user_name: 'Test Creator',
          instance_id: '1',
          ms_open_id: 'creator-ms-open-id',
        },
      },
    } as ParticipantJoinedPayload;

    await handler.handle(payload, 1);

    expect(meetingCoreSvc.upsertPtUser).not.toHaveBeenCalled();
  });
});
