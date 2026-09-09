import { ServiceUnavailableException } from '@nestjs/common';

jest.mock('ali-oss', () => jest.fn());

import { AliyunOssStorageService } from './aliyun-oss-storage.service';

describe('AliyunOssStorageService', () => {
  const originalPublicBaseUrl = process.env.ALIYUN_OSS_PUBLIC_BASE_URL;
  const originalSignedUrlExpires =
    process.env.ALIYUN_OSS_SIGNED_URL_EXPIRES_SECONDS;

  function withClient(
    service: AliyunOssStorageService,
    client: { put: jest.Mock; delete: jest.Mock; signatureUrl: jest.Mock },
  ) {
    (service as unknown as { client: typeof client }).client = client;
  }

  afterEach(() => {
    if (originalPublicBaseUrl === undefined) {
      delete process.env.ALIYUN_OSS_PUBLIC_BASE_URL;
    } else {
      process.env.ALIYUN_OSS_PUBLIC_BASE_URL = originalPublicBaseUrl;
    }
    if (originalSignedUrlExpires === undefined) {
      delete process.env.ALIYUN_OSS_SIGNED_URL_EXPIRES_SECONDS;
    } else {
      process.env.ALIYUN_OSS_SIGNED_URL_EXPIRES_SECONDS =
        originalSignedUrlExpires;
    }
  });

  it('recognizes only avatar objects under the configured public base URL', () => {
    process.env.ALIYUN_OSS_PUBLIC_BASE_URL = 'https://cdn.example.com/media';
    const service = new AliyunOssStorageService();

    expect(
      service.getManagedKey(
        'https://cdn.example.com/media/avatars/user-1/avatar.webp',
      ),
    ).toBe('avatars/user-1/avatar.webp');
    expect(
      service.getManagedKey(
        'https://cdn.example.com/media/projects/image.webp',
      ),
    ).toBeNull();
    expect(
      service.getManagedKey(
        'https://external.example/media/avatars/user-1/avatar.webp',
      ),
    ).toBeNull();
  });

  it('reports missing storage configuration before uploading', async () => {
    delete process.env.ALIYUN_OSS_PUBLIC_BASE_URL;
    const service = new AliyunOssStorageService();

    await expect(
      service.putObject({
        key: 'avatars/user-1/avatar.webp',
        body: Buffer.from('avatar'),
        contentType: 'image/webp',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('keeps uploaded objects private', async () => {
    process.env.ALIYUN_OSS_PUBLIC_BASE_URL = 'https://cdn.example.com';
    const service = new AliyunOssStorageService();
    const client = {
      put: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn(),
      signatureUrl: jest.fn(),
    };
    withClient(service, client);

    await expect(
      service.putObject({
        key: 'avatars/user-1/avatar.webp',
        body: Buffer.from('avatar'),
        contentType: 'image/webp',
        cacheControl: 'public, max-age=31536000, immutable',
        access: 'private',
      }),
    ).resolves.toEqual({
      key: 'avatars/user-1/avatar.webp',
      url: 'https://cdn.example.com/avatars/user-1/avatar.webp',
    });
    expect(client.put).toHaveBeenCalledWith(
      'avatars/user-1/avatar.webp',
      expect.any(Buffer),
      {
        headers: {
          'Content-Type': 'image/webp',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'x-oss-object-acl': 'private',
        },
      },
    );
  });

  it('maps OSS upload failures to a clear service unavailable response', async () => {
    process.env.ALIYUN_OSS_PUBLIC_BASE_URL = 'https://cdn.example.com';
    const service = new AliyunOssStorageService();
    const client = {
      put: jest.fn().mockRejectedValue(new Error('OSS unavailable')),
      delete: jest.fn(),
      signatureUrl: jest.fn(),
    };
    withClient(service, client);

    await expect(
      service.putObject({
        key: 'avatars/user-1/avatar.webp',
        body: Buffer.from('avatar'),
        contentType: 'image/webp',
        access: 'private',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('creates a short-lived signed GET URL only for managed avatars', () => {
    process.env.ALIYUN_OSS_PUBLIC_BASE_URL = 'https://cdn.example.com/media';
    process.env.ALIYUN_OSS_SIGNED_URL_EXPIRES_SECONDS = '300';
    const service = new AliyunOssStorageService();
    const client = {
      put: jest.fn(),
      delete: jest.fn(),
      signatureUrl: jest
        .fn()
        .mockReturnValue('https://signed.example.com/avatar.webp?signature=1'),
    };
    withClient(service, client);

    expect(
      service.getReadUrl(
        'https://cdn.example.com/media/avatars/user-1/avatar.webp',
      ),
    ).toBe('https://signed.example.com/avatar.webp?signature=1');
    expect(client.signatureUrl).toHaveBeenCalledWith(
      'avatars/user-1/avatar.webp',
      {
        expires: 300,
        method: 'GET',
        response: {
          'cache-control': 'private, max-age=300',
        },
      },
    );
    expect(service.getReadUrl('https://external.example/avatar.png')).toBe(
      'https://external.example/avatar.png',
    );
    expect(client.signatureUrl).toHaveBeenCalledTimes(1);
  });

  it('does not override Content-Type in drive download URLs', () => {
    const service = new AliyunOssStorageService();
    const client = {
      put: jest.fn(),
      delete: jest.fn(),
      signatureUrl: jest
        .fn()
        .mockReturnValue('https://signed.example.com/report.pdf?signature=1'),
    };
    withClient(service, client);

    expect(
      service.getDownloadUrl({
        key: 'drive/space-1/report.pdf',
        fileName: '季度报告.pdf',
        contentType: 'application/pdf',
        expiresSeconds: 600,
      }),
    ).toBe('https://signed.example.com/report.pdf?signature=1');
    expect(client.signatureUrl).toHaveBeenCalledWith(
      'drive/space-1/report.pdf',
      {
        expires: 600,
        method: 'GET',
        response: {
          'content-disposition':
            "attachment; filename*=UTF-8''%E5%AD%A3%E5%BA%A6%E6%8A%A5%E5%91%8A.pdf",
          'cache-control': 'private, no-store',
        },
      },
    );
  });

  it('loads dynamic configuration from IntegrationsService and reloads on events', async () => {
    const mockIntegrations = {
      getEffectiveConfig: jest.fn().mockResolvedValue({
        source: 'database',
        value: {
          region: 'oss-cn-beijing',
          bucket: 'dynamic-bucket',
          accessKeyId: 'dyn-ak',
          accessKeySecret: 'dyn-sk',
          publicBaseUrl: 'https://dynamic.example.com',
          signedUrlExpiresSeconds: 1200,
        },
      }),
    };
    const mockOrg = {
      getOrgId: jest.fn().mockReturnValue('org-123'),
      matches: jest.fn((id: string) => id === 'org-123'),
    };

    const service = new AliyunOssStorageService(
      mockIntegrations as never,
      mockOrg as never,
    );
    await service.onModuleInit();

    expect(service.getBucket()).toBe('dynamic-bucket');
    expect(
      service.getManagedKey('https://dynamic.example.com/avatars/user-1/a.webp'),
    ).toBe('avatars/user-1/a.webp');

    // Simulate update event with new bucket
    mockIntegrations.getEffectiveConfig.mockResolvedValueOnce({
      source: 'database',
      value: {
        region: 'oss-cn-shanghai',
        bucket: 'reloaded-bucket',
        accessKeyId: 'dyn-ak-2',
        accessKeySecret: 'dyn-sk-2',
        publicBaseUrl: 'https://reloaded.example.com',
        signedUrlExpiresSeconds: 1800,
      },
    });

    await service.handleStorageConfigUpdate({
      orgId: 'org-123',
      value: {},
    });

    expect(service.getBucket()).toBe('reloaded-bucket');

    // Simulate delete event (fallback to env)
    process.env.ALIYUN_OSS_BUCKET = 'fallback-env-bucket';
    mockIntegrations.getEffectiveConfig.mockResolvedValueOnce({
      source: 'default',
      value: {},
    });

    await service.handleStorageConfigDelete({
      orgId: 'org-123',
      value: {},
    });

    expect(service.getBucket()).toBe('fallback-env-bucket');
  });
});

