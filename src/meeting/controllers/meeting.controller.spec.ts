import { BadRequestException, RequestMethod } from '@nestjs/common';
import { METHOD_METADATA } from '@nestjs/common/constants';
import { MeetingController } from './meeting.controller';
import { MeetingService } from '../services/meeting.service';
import type { AuthContext } from '@/auth/types/auth-context.interface';

const auth = {
  authMethod: 'jwt',
  userId: 'user-1',
  orgId: 'org-1',
  permissions: ['meeting:read'],
} satisfies AuthContext;

describe('MeetingController', () => {
  const meetingService = {
    delete: jest.fn(),
    getStats: jest.fn(),
    findParticipants: jest.fn(),
    requireOrgId: jest.fn((orgId: string) => orgId),
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
      controller.getMeetingStats(
        {
          startDate: '2026-08-31T23:59:59.999+08:00',
          endDate: '2026-08-01T00:00:00.000+08:00',
        },
        auth,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(meetingService.getStats).not.toHaveBeenCalled();
  });

  it('rejects an empty statistics date range before querying', async () => {
    await expect(
      controller.getMeetingStats(
        {
          startDate: '2026-08-24T00:00:00.000+08:00',
          endDate: '2026-08-24T00:00:00.000+08:00',
        },
        auth,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(meetingService.getStats).not.toHaveBeenCalled();
  });

  it('returns the persisted soft-delete timestamp', async () => {
    const deletedAt = new Date('2026-08-13T01:00:00.000Z');
    const deletedRecord = { id: 'meeting-1', deletedAt };
    meetingService.delete.mockResolvedValue(deletedRecord);

    await expect(
      controller.deleteMeetingRecord('meeting-1', auth),
    ).resolves.toEqual({
      success: true,
      data: deletedRecord,
      deletedAt,
    });
  });

  it('returns participants from the meeting service', async () => {
    const result = { data: [], total: 0, page: 1, limit: 50, totalPages: 0 };
    meetingService.findParticipants.mockResolvedValue(result);

    await expect(
      controller.getMeetingParticipants(
        'meeting-1',
        { page: 1, limit: 50 },
        auth,
      ),
    ).resolves.toBe(result);
    expect(meetingService.findParticipants).toHaveBeenCalledWith(
      'meeting-1',
      { page: 1, limit: 50 },
      'org-1',
    );
  });
});
