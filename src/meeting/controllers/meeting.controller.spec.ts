import { BadRequestException, RequestMethod } from '@nestjs/common';
import { METHOD_METADATA } from '@nestjs/common/constants';
import { MeetingController } from './meeting.controller';
import { MeetingService } from '../services/meeting.service';

describe('MeetingController', () => {
  const meetingService = {
    delete: jest.fn(),
    getStats: jest.fn(),
    findParticipants: jest.fn(),
  };
  let controller: MeetingController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new MeetingController(
      meetingService as unknown as MeetingService,
    );
  });

  it('uses PATCH for partial meeting updates', () => {
    expect(
      Reflect.getMetadata(
        METHOD_METADATA,
        // eslint-disable-next-line @typescript-eslint/unbound-method
        MeetingController.prototype.updateMeetingRecord,
      ),
    ).toBe(RequestMethod.PATCH);
  });

  it('rejects an inverted statistics date range before querying', async () => {
    await expect(
      controller.getMeetingStats({
        startDate: '2026-08-31T23:59:59.999+08:00',
        endDate: '2026-08-01T00:00:00.000+08:00',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(meetingService.getStats).not.toHaveBeenCalled();
  });

  it('returns the persisted soft-delete timestamp', async () => {
    const deletedAt = new Date('2026-08-13T01:00:00.000Z');
    const deletedRecord = { id: 'meeting-1', deletedAt };
    meetingService.delete.mockResolvedValue(deletedRecord);

    await expect(controller.deleteMeetingRecord('meeting-1')).resolves.toEqual({
      success: true,
      data: deletedRecord,
      deletedAt,
    });
  });

  it('returns participants from the meeting service', async () => {
    const result = { data: [], total: 0, page: 1, limit: 50, totalPages: 0 };
    meetingService.findParticipants.mockResolvedValue(result);

    await expect(
      controller.getMeetingParticipants('meeting-1', { page: 1, limit: 50 }),
    ).resolves.toBe(result);
    expect(meetingService.findParticipants).toHaveBeenCalledWith('meeting-1', {
      page: 1,
      limit: 50,
    });
  });
});
