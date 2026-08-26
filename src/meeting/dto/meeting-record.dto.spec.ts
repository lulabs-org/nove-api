import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MeetingPlatform, MeetingType } from '@prisma/client';
import { CreateMeetingRecordDto } from './meeting-record-create.dto';
import { QueryMeetingStatsDto } from './meeting-record-stats.dto';
import { UpdateMeetingRecordDto } from './meeting-record-update.dto';

const validateRequest = (value: object) =>
  validate(value, { whitelist: true, forbidNonWhitelisted: true });

describe('meeting record DTO contracts', () => {
  it('rejects invalid statistics dates', async () => {
    const dto = plainToInstance(QueryMeetingStatsDto, {
      startDate: 'not-a-date',
    });

    await expect(validateRequest(dto)).resolves.toHaveLength(1);
  });

  it('accepts ISO statistics dates with timezone information', async () => {
    const dto = plainToInstance(QueryMeetingStatsDto, {
      startDate: '2026-08-01T00:00:00.000+08:00',
      endDate: '2026-08-31T23:59:59.999+08:00',
    });

    await expect(validateRequest(dto)).resolves.toHaveLength(0);
  });

  it('rejects statistics dates without timezone information', async () => {
    const dto = plainToInstance(QueryMeetingStatsDto, {
      startDate: '2026-08-01',
    });

    await expect(validateRequest(dto)).resolves.toHaveLength(1);
  });

  it('does not accept removed create fields that were previously ignored', async () => {
    const dto = plainToInstance(CreateMeetingRecordDto, {
      platform: MeetingPlatform.TENCENT_MEETING,
      platformMeetingId: 'meeting-1',
      title: 'Meeting',
      type: MeetingType.SCHEDULED,
      platformRecordingId: 'recording-1',
      hostUserName: 'Ignored Host',
    });

    const errors = await validateRequest(dto);

    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['platformRecordingId', 'hostUserName']),
    );
  });

  it('does not accept removed update fields and preserves numeric zero', async () => {
    const dto = plainToInstance(UpdateMeetingRecordDto, {
      durationSeconds: 0,
      participantCount: 0,
      hostUserName: 'Ignored Host',
      participantList: [],
      processingStatus: 'COMPLETED',
      recordingStatus: 'COMPLETED',
    });

    const errors = await validateRequest(dto);

    expect(dto.durationSeconds).toBe(0);
    expect(dto.participantCount).toBe(0);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining([
        'hostUserName',
        'participantList',
        'processingStatus',
        'recordingStatus',
      ]),
    );
  });
});
