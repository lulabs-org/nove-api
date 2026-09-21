import { BadRequestException } from '@nestjs/common';
import { sharpFactory } from '@/common/utils/sharp-factory';
import type { ObjectStorage } from './object-storage.interface';
import { MailBrandLogoService } from './mail-brand-logo.service';

describe('MailBrandLogoService', () => {
  const integrations = {
    getEffectiveConfig: jest.fn(),
    updateIntegration: jest.fn(),
  };
  const objectStorage = {
    putObject: jest.fn(),
    deleteObject: jest.fn(),
    getManagedKey: jest.fn(),
  };
  let service: MailBrandLogoService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MailBrandLogoService(
      integrations as never,
      objectStorage as never,
    );
    integrations.getEffectiveConfig.mockResolvedValue({
      value: { brandLogoUrl: null },
    });
    integrations.updateIntegration.mockResolvedValue({ success: true });
    objectStorage.putObject.mockResolvedValue({
      key: 'mail-brand-logos/org-1/new.webp',
      url: 'https://cdn.example.com/mail-brand-logos/org-1/new.webp',
    });
    objectStorage.deleteObject.mockResolvedValue(undefined);
    objectStorage.getManagedKey.mockReturnValue(null);
  });

  async function pngFile(mimetype = 'image/png') {
    const buffer = await sharpFactory({
      create: {
        width: 200,
        height: 80,
        channels: 4,
        background: { r: 37, g: 99, b: 235, alpha: 1 },
      },
    })
      .png()
      .toBuffer();
    return { buffer, mimetype, size: buffer.length };
  }

  it('normalizes, uploads, and activates a local logo', async () => {
    const result = await service.upload('org-1', await pngFile());

    expect(result).toEqual({
      url: 'https://cdn.example.com/mail-brand-logos/org-1/new.webp',
    });
    expect(objectStorage.putObject).toHaveBeenCalledTimes(1);
    const putObject = objectStorage.putObject as jest.MockedFunction<
      ObjectStorage['putObject']
    >;
    const uploadInput = putObject.mock.calls[0]?.[0];
    expect(uploadInput).toBeDefined();
    if (!uploadInput) throw new Error('missing upload input');
    expect(uploadInput.key).toMatch(/^mail-brand-logos\/org-1\/.+\.webp$/);
    expect(uploadInput.body).toBeInstanceOf(Buffer);
    expect(uploadInput).toMatchObject({
      contentType: 'image/webp',
      cacheControl: 'public, max-age=31536000, immutable',
      access: 'public-read',
    });
    expect(integrations.updateIntegration).toHaveBeenCalledWith(
      'org-1',
      'mail',
      { brandLogoUrl: result.url },
    );
  });

  it('removes the previous managed logo after replacement', async () => {
    integrations.getEffectiveConfig.mockResolvedValue({
      value: {
        brandLogoUrl: 'https://cdn.example.com/mail-brand-logos/org-1/old.webp',
      },
    });
    objectStorage.getManagedKey.mockReturnValue(
      'mail-brand-logos/org-1/old.webp',
    );

    await service.upload('org-1', await pngFile());

    expect(objectStorage.deleteObject).toHaveBeenCalledWith(
      'mail-brand-logos/org-1/old.webp',
    );
  });

  it('rejects files whose declared MIME type does not match their contents', async () => {
    await expect(
      service.upload('org-1', await pngFile('image/jpeg')),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(objectStorage.putObject).not.toHaveBeenCalled();
  });

  it('clears the config but never deletes an external legacy logo', async () => {
    integrations.getEffectiveConfig.mockResolvedValue({
      value: { brandLogoUrl: 'https://external.example.com/logo.png' },
    });

    await expect(service.remove('org-1')).resolves.toEqual({ url: null });
    expect(integrations.updateIntegration).toHaveBeenCalledWith(
      'org-1',
      'mail',
      { brandLogoUrl: '' },
    );
    expect(objectStorage.deleteObject).not.toHaveBeenCalled();
  });
});
