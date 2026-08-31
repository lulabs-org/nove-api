import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class MeetingOrganizationService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveDefaultOrgId(): Promise<string> {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key: 'DRIVE_CONFIG' },
      select: { value: true },
    });
    const value = config?.value as { defaultOrgId?: unknown } | undefined;
    const configured =
      (typeof value?.defaultOrgId === 'string' && value.defaultOrgId.trim()) ||
      process.env.MEETING_DEFAULT_ORG_ID?.trim() ||
      null;
    if (!configured) {
      throw new ServiceUnavailableException('会议同步默认组织尚未配置');
    }
    const org = await this.prisma.org.findFirst({
      where: { id: configured, active: true, deletedAt: null },
      select: { id: true },
    });
    if (!org) {
      throw new ServiceUnavailableException('会议同步默认组织不存在或已停用');
    }
    return org.id;
  }
}
