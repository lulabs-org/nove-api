import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class SingleOrgContextService {
  private orgId: string | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async initialize(): Promise<string> {
    const organizations = await this.prisma.org.findMany({
      where: { active: true, deletedAt: null },
      select: { id: true },
      take: 2,
    });

    if (organizations.length !== 1) {
      throw new Error(
        `Single-organization runtime requires exactly one active organization; found ${organizations.length}`,
      );
    }

    this.orgId = organizations[0].id;
    return this.orgId;
  }

  getOrgId(): string {
    if (!this.orgId) {
      throw new Error('Single-organization runtime context is not initialized');
    }
    return this.orgId;
  }

  matches(orgId: string): boolean {
    return this.getOrgId() === orgId;
  }
}
