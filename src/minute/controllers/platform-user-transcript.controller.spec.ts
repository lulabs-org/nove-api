/* eslint-disable @typescript-eslint/unbound-method */
import { PATH_METADATA } from '@nestjs/common/constants';
import {
  PERMISSIONS_KEY,
  PERMISSION_MODE_KEY,
  PermissionMode,
} from '@/admin/permission/decorators/permissions.decorator';
import { PlatformUserTranscriptService } from '../services/platform-user-transcript.service';
import { PlatformUserTranscriptController } from './platform-user-transcript.controller';

describe('PlatformUserTranscriptController', () => {
  const service = {
    getMeetingTranscripts: jest.fn(),
    getTranscriptContext: jest.fn(),
  };
  const controller = new PlatformUserTranscriptController(
    service as unknown as PlatformUserTranscriptService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('exposes both transcript query routes', () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, controller.getMeetingTranscripts),
    ).toBe('platform-users/:platformUserId/meeting-transcripts');
    expect(
      Reflect.getMetadata(PATH_METADATA, controller.getTranscriptContext),
    ).toBe(
      'minutes/:minuteId/platform-users/:platformUserId/transcript-context',
    );
  });

  it.each([['getMeetingTranscripts'], ['getTranscriptContext']] as const)(
    'requires both platform-user and minute read permissions for %s',
    (method) => {
      expect(Reflect.getMetadata(PERMISSIONS_KEY, controller[method])).toEqual([
        'platform-user:read',
        'minute:read',
      ]);
      expect(Reflect.getMetadata(PERMISSION_MODE_KEY, controller[method])).toBe(
        PermissionMode.ALL,
      );
    },
  );

  it('delegates meeting transcript queries', async () => {
    service.getMeetingTranscripts.mockResolvedValue({ meetings: [] });

    await controller.getMeetingTranscripts('platform-user-1', {
      startDate: '2026-08-01T00:00:00Z',
      endDate: '2026-09-01T00:00:00Z',
    });

    expect(service.getMeetingTranscripts).toHaveBeenCalledWith(
      'platform-user-1',
      '2026-08-01T00:00:00Z',
      '2026-09-01T00:00:00Z',
    );
  });
});
