import { EmailBrandResolverService } from './email-brand-resolver.service';

describe('EmailBrandResolverService', () => {
  const prisma = { org: { findFirst: jest.fn() } };
  let service: EmailBrandResolverService;
  const systemConfigService = {
    getEffectiveConfig: jest.fn().mockResolvedValue({
      value: {
        brandName: 'Nove Platform',
        brandLogoUrl: 'https://cdn.example.com/platform.png',
        brandPrimaryColor: '#123456',
        brandFooterText: '平台自动邮件',
        brandPublicBaseUrl: 'https://assets.example.com/',
      },
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EmailBrandResolverService(
      prisma as never,
      systemConfigService as never,
    );
  });

  it('returns the platform brand when no organization context exists', async () => {
    await expect(service.resolve()).resolves.toEqual({
      name: 'Nove Platform',
      logoUrl: 'https://cdn.example.com/platform.png',
      primaryColor: '#123456',
      footerText: '平台自动邮件',
    });
    expect(prisma.org.findFirst).not.toHaveBeenCalled();
  });

  it('uses an active organization name and resolves its hosted logo', async () => {
    prisma.org.findFirst.mockResolvedValue({
      name: '示例组织',
      logo: '/logos/example.png',
    });

    await expect(service.resolve({ orgId: 'org-1' })).resolves.toEqual({
      name: '示例组织',
      logoUrl: 'https://assets.example.com/logos/example.png',
      primaryColor: '#123456',
      footerText: '此邮件由 示例组织 通过 Nove Platform 发送，请勿回复。',
    });
    expect(prisma.org.findFirst).toHaveBeenCalledWith({
      where: { id: 'org-1', active: true, deletedAt: null },
      select: { name: true, logo: true },
    });
  });

  it('falls back safely for missing organizations and unsafe logos', async () => {
    prisma.org.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({
      name: '示例组织',
      logo: 'http://unsafe/logo.png',
    });

    const missing = await service.resolve({ orgId: 'missing' });
    const unsafeLogo = await service.resolve({ orgId: 'org-1' });

    expect(missing.name).toBe('Nove Platform');
    expect(unsafeLogo).toMatchObject({
      name: '示例组织',
      logoUrl: null,
    });
  });
});
