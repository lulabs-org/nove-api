import { REQUIRE_AUTH_KEY } from '@/auth/decorators/require-auth.decorator';
import { UserController } from './user.controller';

describe('UserController avatar endpoints', () => {
  const profileService = {
    uploadAvatar: jest.fn(),
    deleteAvatar: jest.fn(),
  };
  const controller = new UserController(profileService as never);

  beforeEach(() => jest.clearAllMocks());

  it('delegates avatar upload for the authenticated user', async () => {
    const file = {
      buffer: Buffer.from('avatar'),
      mimetype: 'image/png',
      size: 6,
    };
    profileService.uploadAvatar.mockResolvedValue({ id: 'user-1' });

    await expect(
      controller.uploadAvatar({ id: 'user-1' } as never, file),
    ).resolves.toEqual({ id: 'user-1' });
    expect(profileService.uploadAvatar.mock.calls[0]).toEqual(['user-1', file]);
  });

  it('delegates avatar deletion for the authenticated user', async () => {
    profileService.deleteAvatar.mockResolvedValue({ id: 'user-1' });

    await expect(
      controller.deleteAvatar({ id: 'user-1' } as never),
    ).resolves.toEqual({ id: 'user-1' });
    expect(profileService.deleteAvatar.mock.calls[0]).toEqual(['user-1']);
  });

  it('requires ordinary JWT authentication on avatar mutations', () => {
    expect(
      Reflect.getMetadata(
        REQUIRE_AUTH_KEY,
        // eslint-disable-next-line @typescript-eslint/unbound-method
        UserController.prototype.uploadAvatar,
      ),
    ).toEqual(['jwt']);
    expect(
      Reflect.getMetadata(
        REQUIRE_AUTH_KEY,
        // eslint-disable-next-line @typescript-eslint/unbound-method
        UserController.prototype.deleteAvatar,
      ),
    ).toEqual(['jwt']);
  });
});
