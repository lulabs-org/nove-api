import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { EmailBrand, EmailBrandContext } from '@/mail/templates';
import {
  sanitizeEmailColor,
  sanitizeEmailLogoUrl,
} from '@/mail/templates/helpers';
import {
  SingleOrgContextService,
  SystemConfigService,
} from '@/admin/system-config/services';

@Injectable()
export class EmailBrandResolverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly systemConfigService: SystemConfigService,
    private readonly orgContext: SingleOrgContextService,
  ) {}

  async resolve(context?: EmailBrandContext): Promise<EmailBrand> {
    const platform = await this.getPlatformBrand();
    const fallback = platform.brand;
    if (!context?.orgId) return fallback;

    const organization = await this.prisma.org.findFirst({
      where: {
        id: context.orgId,
        active: true,
        deletedAt: null,
      },
      select: {
        name: true,
        logo: true,
      },
    });
    if (!organization) return fallback;

    const organizationName = organization.name.trim() || fallback.name;
    return {
      ...fallback,
      name: organizationName,
      logoUrl: this.resolveLogoUrl(organization.logo, platform.publicBaseUrl),
      footerText: `此邮件由 ${organizationName} 通过 ${fallback.name} 发送，请勿回复。`,
    };
  }

  private async getPlatformBrand(): Promise<{
    brand: EmailBrand;
    publicBaseUrl: string | null;
  }> {
    const { value } = await this.systemConfigService.getEffectiveConfig(
      this.orgContext.getOrgId(),
      'mail',
    );
    const publicBaseUrl = String(value.brandPublicBaseUrl ?? '') || null;
    return {
      publicBaseUrl,
      brand: {
        name: String(value.brandName ?? 'Nove System'),
        logoUrl: this.resolveLogoUrl(
          String(value.brandLogoUrl ?? '') || null,
          publicBaseUrl,
        ),
        primaryColor: sanitizeEmailColor(
          String(value.brandPrimaryColor ?? '#2563eb'),
        ),
        footerText: String(value.brandFooterText ?? ''),
      },
    };
  }

  private resolveLogoUrl(
    value: string | null,
    configuredBaseUrl: string | null = null,
  ): string | null {
    if (!value) return null;
    if (value.startsWith('/')) {
      const baseUrl = configuredBaseUrl?.replace(/\/+$/, '');
      if (!baseUrl) return null;
      return sanitizeEmailLogoUrl(`${baseUrl}${value}`);
    }
    return sanitizeEmailLogoUrl(value);
  }
}
