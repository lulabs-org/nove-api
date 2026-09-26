import { BadRequestException } from '@nestjs/common';
import { sharpFactory } from '@/common/utils/sharp-factory';
import type { PutObjectInput } from './object-storage.interface';
import { OrganizationProfileService } from './organization-profile.service';

describe('OrganizationProfileService', () => {
  const organizations = {
    getOrganization: jest.fn(),
    updateOrganization: jest.fn(),
  };
  const storage = {
    putObject: jest.fn<
      Promise<{ key: string; url: string }>,
      [PutObjectInput]
    >(),
    deleteObject: jest.fn(),
    getManagedKey: jest.fn(),
  };
  let service: OrganizationProfileService;
  beforeEach(() => {
    jest.resetAllMocks();
    service = new OrganizationProfileService(
      organizations as never,
      storage as never,
    );
    organizations.getOrganization.mockResolvedValue({
      logo: 'https://cdn.example.com/old.webp',
    });
    organizations.updateOrganization.mockResolvedValue({
      id: 'org-1',
      logo: 'https://cdn.example.com/new.webp',
    });
    storage.putObject.mockResolvedValue({
      key: 'organization-logos/org-1/new.webp',
      url: 'https://cdn.example.com/new.webp',
    });
    storage.getManagedKey.mockReturnValue('organization-logos/org-1/old.webp');
    storage.deleteObject.mockResolvedValue(undefined);
  });
  async function png() {
    const buffer = await sharpFactory({
      create: { width: 800, height: 400, channels: 4, background: '#3370ff' },
    })
      .png()
      .toBuffer();
    return { buffer, mimetype: 'image/png', size: buffer.length };
  }
  it('normalizes the logo and saves all fields together before removing the previous asset', async () => {
    await service.save('org-1', { name: 'Acme', active: false }, await png());
    const uploaded = storage.putObject.mock.calls[0][0] as {
      body: Buffer;
      key: string;
    };
    expect(uploaded.key).toMatch(/^organization-logos\/org-1\/.+\.webp$/);
    expect(await sharpFactory(uploaded.body).metadata()).toMatchObject({
      format: 'webp',
      width: 512,
      height: 256,
    });
    expect(organizations.updateOrganization).toHaveBeenCalledWith('org-1', {
      name: 'Acme',
      active: false,
      logo: 'https://cdn.example.com/new.webp',
    });
    expect(storage.deleteObject).toHaveBeenCalledWith(
      'organization-logos/org-1/old.webp',
    );
    expect(
      organizations.updateOrganization.mock.invocationCallOrder[0],
    ).toBeLessThan(storage.deleteObject.mock.invocationCallOrder[0]);
  });
  it('reclaims a new upload on database failure and retains the previous logo', async () => {
    organizations.updateOrganization.mockRejectedValue(
      new Error('database write failed'),
    );
    await expect(
      service.save('org-1', { name: 'Acme' }, await png()),
    ).rejects.toThrow('database write failed');
    expect(storage.deleteObject).toHaveBeenCalledTimes(1);
    expect(storage.deleteObject).toHaveBeenCalledWith(
      'organization-logos/org-1/new.webp',
    );
  });
  it('does not write organization fields when storage fails', async () => {
    storage.putObject.mockRejectedValue(new Error('storage unavailable'));
    await expect(service.save('org-1', {}, await png())).rejects.toThrow(
      'storage unavailable',
    );
    expect(organizations.updateOrganization).not.toHaveBeenCalled();
  });
  it('keeps the current logo when saving only text', async () => {
    await service.save('org-1', { name: 'Acme', logoAction: 'keep' });
    expect(organizations.updateOrganization).toHaveBeenCalledWith('org-1', {
      name: 'Acme',
    });
    expect(storage.putObject).not.toHaveBeenCalled();
    expect(storage.deleteObject).not.toHaveBeenCalled();
  });
  it('removes the current managed logo', async () => {
    await service.save('org-1', { logoAction: 'remove' });
    expect(organizations.updateOrganization).toHaveBeenCalledWith('org-1', {
      logo: '',
    });
    expect(storage.deleteObject).toHaveBeenCalledWith(
      'organization-logos/org-1/old.webp',
    );
  });
  it.each([
    null,
    'organization-logos/other-org/logo.webp',
    'avatars/user/avatar.webp',
  ])('does not delete external or unrelated assets (%s)', async (key) => {
    storage.getManagedKey.mockReturnValue(key);
    await service.save('org-1', { logoAction: 'remove' });
    expect(storage.deleteObject).not.toHaveBeenCalled();
  });
  it.each(['image/jpeg', 'image/svg+xml'])(
    'rejects unsupported or spoofed MIME %s',
    async (mimetype) => {
      await expect(
        service.save('org-1', {}, { ...(await png()), mimetype }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(storage.putObject).not.toHaveBeenCalled();
    },
  );
  it('rejects corrupt and oversized images', async () => {
    await expect(
      service.save(
        'org-1',
        {},
        {
          buffer: Buffer.from('not an image'),
          mimetype: 'image/png',
          size: 12,
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.save(
        'org-1',
        {},
        { ...(await png()), size: 5 * 1024 * 1024 + 1 },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.putObject).not.toHaveBeenCalled();
  });
  it('rejects ambiguous upload and removal', async () => {
    await expect(
      service.save('org-1', { logoAction: 'remove' }, await png()),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.putObject).not.toHaveBeenCalled();
  });
});
