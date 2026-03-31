/* eslint-disable @typescript-eslint/unbound-method */
/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-23 04:23:42
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-12-31 19:22:18
 * @FilePath: /lulab_backend/src/hook-tencent-mtg/handlers/events/meeting-participant-joined.handler.spec.ts
 * @Description:
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { MeetingParticipantJoinedHandler } from './meeting-participant-joined.handler';
import { MeetingBitableService } from '../../services/meeting-bitable.service';
import { MeetingDatabaseService } from '../../services/meeting-database.service';
import { ParticipantJoinedPayload } from '../../types';

describe('MeetingParticipantJoinedHandler', () => {
  let handler: MeetingParticipantJoinedHandler;
  let meetingRecordService: jest.Mocked<MeetingBitableService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeetingParticipantJoinedHandler,
        {
          provide: MeetingBitableService,
          useValue: {
            updateMeetingParticipants: jest.fn().mockImplementation(() => {}),
            upsertMeetingUserRecord: jest.fn().mockImplementation(() => {}),
          },
        },
        {
          provide: MeetingDatabaseService,
          useValue: {
            upsertPlatformUser: jest.fn().mockImplementation(() => {}),
          },
        },
      ],
    }).compile();

    handler = module.get<MeetingParticipantJoinedHandler>(
      MeetingParticipantJoinedHandler,
    );
    meetingRecordService = module.get(MeetingBitableService);
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

    meetingRecordService.upsertMeetingUserRecord.mockResolvedValue('record-id');
    meetingRecordService.updateMeetingParticipants.mockResolvedValue();

    await handler.handle(payload, 1);

    expect(meetingRecordService.upsertMeetingUserRecord).toHaveBeenCalledTimes(
      2,
    );
    expect(meetingRecordService.upsertMeetingUserRecord).toHaveBeenCalledWith(
      payload.operator,
    );
    expect(meetingRecordService.upsertMeetingUserRecord).toHaveBeenCalledWith(
      payload.meeting_info?.creator,
    );
    expect(
      meetingRecordService.updateMeetingParticipants,
    ).toHaveBeenCalledTimes(1);
    expect(meetingRecordService.updateMeetingParticipants).toHaveBeenCalledWith(
      payload.meeting_info,
      payload.operator,
    );
  });

  it('should handle errors gracefully', async () => {
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

    meetingRecordService.upsertMeetingUserRecord.mockRejectedValue(
      new Error('Service error'),
    );

    await expect(handler.handle(payload, 1)).resolves.not.toThrow();
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

    expect(meetingRecordService.upsertMeetingUserRecord).not.toHaveBeenCalled();
    expect(
      meetingRecordService.updateMeetingParticipants,
    ).not.toHaveBeenCalled();
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

    expect(meetingRecordService.upsertMeetingUserRecord).not.toHaveBeenCalled();
    expect(
      meetingRecordService.updateMeetingParticipants,
    ).not.toHaveBeenCalled();
  });
});
