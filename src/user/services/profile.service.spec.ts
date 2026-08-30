import { BadRequestException } from '@nestjs/common';
import { sharpFactory } from '@/common/utils/sharp-factory';
import { ProfileService } from './profile.service';

function createUser(avatar: string | null = null) {
  return {
    id: 'user-1',
    username: 'tester',
    email: 'tester@example.com',
    phone: null,
    countryCode: null,
    emailVerifiedAt: null,
    phoneVerifiedAt: null,
    lastLoginAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    profile: {
      id: 'profile-1',
      userId: 'user-1',
      displayName: '测试用户',
      avatar,
      bio: null,
      fullName: null,
      dateOfBirth: null,
      gender: null,
      address: null,
      city: null,
      country: null,
      zipCode: null,
      website: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    },
  };
}

describe('ProfileService avatar management', () => {
  const userQueryRepo = {
    withProfile: jest.fn(),
    byUsername: jest.fn(),
    byEmail: jest.fn(),
    byPhone: jest.fn(),
  };
  const userCommandRepo = {
    updateProfile: jest.fn(),
    updateAvatar: jest.fn(),
  };
  const objectStorage = {
    putObject: jest.fn(),
    deleteObject: jest.fn(),
    getManagedKey: jest.fn(),
    getReadUrl: jest.fn(),
  };
  let service: ProfileService;

  beforeEach(() => {
    jest.clearAllMocks();
    objectStorage.getReadUrl.mockImplementation((url: string) => url);
    service = new ProfileService(
      userQueryRepo as never,
      userCommandRepo as never,
      objectStorage as never,
    );
  });

  async function avatarFile(mimetype = 'image/png') {
    const buffer = await sharpFactory({
      create: {
        width: 16,
        height: 16,
        channels: 4,
        background: '#1677ff',
      },
    })
      .png()
      .toBuffer();
    return { buffer, mimetype, size: buffer.length };
  }

  it('uploads a normalized avatar, updates the profile, and removes the old managed object', async () => {
    const oldUrl = 'https://cdn.example.com/avatars/user-1/old.webp';
    userQueryRepo.withProfile.mockResolvedValue(createUser(oldUrl));
    let uploadedInput:
      | {
          key: string;
          body: Buffer;
          contentType: string;
          cacheControl?: string;
          access?: 'private';
        }
      | undefined;
    objectStorage.putObject.mockImplementation(
      (input: NonNullable<typeof uploadedInput>) => {
        uploadedInput = input;
        return Promise.resolve({
          key: input.key,
          url: 'https://cdn.example.com/avatars/user-1/new.webp',
        });
      },
    );
    objectStorage.getManagedKey.mockReturnValue('avatars/user-1/old.webp');
    objectStorage.deleteObject.mockResolvedValue(undefined);
    userCommandRepo.updateAvatar.mockResolvedValue(
      createUser('https://cdn.example.com/avatars/user-1/new.webp'),
    );

    const result = await service.uploadAvatar('user-1', await avatarFile());
    await new Promise((resolve) => setImmediate(resolve));

    expect(uploadedInput?.key).toMatch(/^avatars\/user-1\/.+\.webp$/);
    expect(uploadedInput?.contentType).toBe('image/webp');
    expect(uploadedInput?.cacheControl).toBe('private, max-age=0, no-store');
    expect(uploadedInput?.access).toBe('private');
    expect(uploadedInput?.body).toBeDefined();
    expect(await sharpFactory(uploadedInput!.body).metadata()).toEqual(
      expect.objectContaining({ width: 512, height: 512, format: 'webp' }),
    );
    expect(userCommandRepo.updateAvatar).toHaveBeenCalledWith(
      'user-1',
      'https://cdn.example.com/avatars/user-1/new.webp',
    );
    expect(objectStorage.deleteObject).toHaveBeenCalledWith(
      'avatars/user-1/old.webp',
    );
    expect(result.profile?.avatar).toBe(
      'https://cdn.example.com/avatars/user-1/new.webp',
    );
  });

  it('removes the newly uploaded object when the database update fails', async () => {
    userQueryRepo.withProfile.mockResolvedValue(createUser());
    objectStorage.putObject.mockResolvedValue({
      key: 'avatars/user-1/new.webp',
      url: 'https://cdn.example.com/avatars/user-1/new.webp',
    });
    objectStorage.deleteObject.mockResolvedValue(undefined);
    userCommandRepo.updateAvatar.mockRejectedValue(new Error('database down'));

    await expect(
      service.uploadAvatar('user-1', await avatarFile()),
    ).rejects.toThrow('database down');
    expect(objectStorage.deleteObject).toHaveBeenCalledWith(
      'avatars/user-1/new.webp',
    );
  });

  it('does not delete an old external avatar', async () => {
    userQueryRepo.withProfile.mockResolvedValue(
      createUser('https://external.example/avatar.png'),
    );
    objectStorage.putObject.mockResolvedValue({
      key: 'avatars/user-1/new.webp',
      url: 'https://cdn.example.com/avatars/user-1/new.webp',
    });
    objectStorage.getManagedKey.mockReturnValue(null);
    userCommandRepo.updateAvatar.mockResolvedValue(
      createUser('https://cdn.example.com/avatars/user-1/new.webp'),
    );

    await service.uploadAvatar('user-1', await avatarFile());
    expect(objectStorage.deleteObject).not.toHaveBeenCalled();
  });

  it('returns a signed URL without persisting it', async () => {
    const storedUrl = 'https://cdn.example.com/avatars/user-1/avatar.webp';
    const signedUrl = `${storedUrl}?Expires=123&Signature=signed`;
    userQueryRepo.withProfile.mockResolvedValue(createUser(storedUrl));
    objectStorage.getReadUrl.mockReturnValue(signedUrl);

    const result = await service.getProfile('user-1');

    expect(objectStorage.getReadUrl).toHaveBeenCalledWith(storedUrl);
    expect(result.profile?.avatar).toBe(signedUrl);
    expect(userCommandRepo.updateAvatar).not.toHaveBeenCalled();
  });

  it.each([
    [undefined, '请选择要上传的头像文件'],
    [
      { buffer: Buffer.from('x'), mimetype: 'image/gif', size: 1 },
      '头像仅支持 JPEG、PNG 或 WebP 格式',
    ],
    [
      {
        buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
        mimetype: 'image/png',
        size: 5 * 1024 * 1024 + 1,
      },
      '头像文件不能超过 5 MB',
    ],
  ])('rejects invalid upload input', async (file, message) => {
    await expect(service.uploadAvatar('user-1', file)).rejects.toThrow(message);
  });

  it('rejects a corrupt image even when the MIME type is allowed', async () => {
    userQueryRepo.withProfile.mockResolvedValue(createUser());
    await expect(
      service.uploadAvatar('user-1', {
        buffer: Buffer.from('not an image'),
        mimetype: 'image/png',
        size: 12,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(objectStorage.putObject).not.toHaveBeenCalled();
  });

  it('rejects a forged MIME type that does not match the decoded image', async () => {
    userQueryRepo.withProfile.mockResolvedValue(createUser());
    await expect(
      service.uploadAvatar('user-1', await avatarFile('image/jpeg')),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(objectStorage.putObject).not.toHaveBeenCalled();
  });

  it('clears the database avatar and removes only a managed object', async () => {
    userQueryRepo.withProfile.mockResolvedValue(
      createUser('https://cdn.example.com/avatars/user-1/old.webp'),
    );
    objectStorage.getManagedKey.mockReturnValue('avatars/user-1/old.webp');
    objectStorage.deleteObject.mockResolvedValue(undefined);
    userCommandRepo.updateAvatar.mockResolvedValue(createUser(null));

    const result = await service.deleteAvatar('user-1');
    await new Promise((resolve) => setImmediate(resolve));

    expect(userCommandRepo.updateAvatar).toHaveBeenCalledWith('user-1', null);
    expect(objectStorage.deleteObject).toHaveBeenCalledWith(
      'avatars/user-1/old.webp',
    );
    expect(result.profile?.avatar).toBeUndefined();
  });
});
