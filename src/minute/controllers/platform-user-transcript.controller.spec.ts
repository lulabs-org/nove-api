/* eslint-disable @typescript-eslint/unbound-method */
import { PATH_METADATA } from '@nestjs/common/constants';
import {
  PERMISSIONS_KEY,
  PERMISSION_MODE_KEY,
  PermissionMode,
} from '@/admin/permission/decorators/permissions.decorator';
import { PlatformUserTranscriptService } from '../services/platform-user-transcript.service';
import { PlatformUserTranscriptController } from './platform-user-transcript.controller';
import { MinuteService } from '../services/minute.service';
import type { AuthContext } from '@/auth/types/auth-context.interface';

const auth = {
  authMethod: 'jwt',
  userId: 'user-1',
  orgId: 'org-1',
  permissions: ['platform-user:read', 'minute:read'],
} satisfies AuthContext;

describe('PlatformUserTranscriptController', () => {
  const service = {
    getMinuteTranscripts: jest.fn(),
    getTranscriptContext: jest.fn(),
  };
  const controller = new PlatformUserTranscriptController(
    service as unknown as PlatformUserTranscriptService,
    { requireOrgId: (orgId: string) => orgId } as unknown as MinuteService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('exposes both transcript query routes', () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, PlatformUserTranscriptController),
    ).toBe('platform-users/:platformUserId');
    expect(
      Reflect.getMetadata(PATH_METADATA, controller.getMinuteTranscripts),
    ).toBe('minutes/transcripts');
    expect(
      Reflect.getMetadata(PATH_METADATA, controller.getTranscriptContext),
    ).toBe('minutes/:minuteId/transcript-context');
  });

  it.each([['getMinuteTranscripts'], ['getTranscriptContext']] as const)(
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

  it('delegates minute transcript queries', async () => {
    service.getMinuteTranscripts.mockResolvedValue({ minutes: [] });

    await controller.getMinuteTranscripts(
      'platform-user-1',
      {
        startDate: '2026-08-01T00:00:00Z',
        endDate: '2026-09-01T00:00:00Z',
      },
      auth,
    );

    expect(service.getMinuteTranscripts).toHaveBeenCalledWith(
      'platform-user-1',
      '2026-08-01T00:00:00Z',
      '2026-09-01T00:00:00Z',
      'org-1',
    );
  });
});
