import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { emailConfig } from '@/configs/email.config';
import { PrismaService } from '@/prisma/prisma.service';
import { EmailBrand, EmailBrandContext } from '@/mail/templates';
import {
  sanitizeEmailColor,
  sanitizeEmailLogoUrl,
} from '@/mail/templates/helpers';

@Injectable()
export class EmailBrandResolverService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(emailConfig.KEY)
    private readonly config: ConfigType<typeof emailConfig>,
  ) {}

  async resolve(context?: EmailBrandContext): Promise<EmailBrand> {
    const fallback = this.getPlatformBrand();
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
      logoUrl: this.resolveLogoUrl(organization.logo),
      footerText: `此邮件由 ${organizationName} 通过 ${fallback.name} 发送，请勿回复。`,
    };
  }

  private getPlatformBrand(): EmailBrand {
    return {
      name: this.config.brand.name,
      logoUrl: this.resolveLogoUrl(this.config.brand.logoUrl),
      primaryColor: sanitizeEmailColor(this.config.brand.primaryColor),
      footerText: this.config.brand.footerText,
    };
  }

  private resolveLogoUrl(value: string | null): string | null {
    if (!value) return null;
    if (value.startsWith('/')) {
      const baseUrl = this.config.brand.publicBaseUrl?.replace(/\/+$/, '');
      if (!baseUrl) return null;
      return sanitizeEmailLogoUrl(`${baseUrl}${value}`);
    }
    return sanitizeEmailLogoUrl(value);
  }
}
