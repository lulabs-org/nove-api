import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  SkillCategory,
  SkillStatus,
  StorageProvider,
} from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { ListSkillsDto, SkillUploadDto } from './skill.dto';

export interface SkillPackageObject {
  id: string;
  key: string;
}

@Injectable()
export class SkillRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListSkillsDto, page: number, pageSize: number) {
    const where: Prisma.SkillWhereInput = {
      ...(query.category && { category: query.category }),
      ...(query.status && { status: query.status }),
      ...(query.keyword && {
        OR: [
          { code: { contains: query.keyword, mode: 'insensitive' } },
          { name: { contains: query.keyword, mode: 'insensitive' } },
          { description: { contains: query.keyword, mode: 'insensitive' } },
        ],
      }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.skill.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.skill.count({ where }),
    ]);
    return { items, total };
  }

  findWithVersions(id: string) {
    return this.prisma.skill.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
          include: { packageStorage: true },
        },
      },
    });
  }

  findById(id: string) {
    return this.prisma.skill.findUnique({ where: { id } });
  }

  findByCode(code: string) {
    return this.prisma.skill.findUnique({ where: { code } });
  }

  findVersion(skillId: string, version: string) {
    return this.prisma.skillVersion.findUnique({
      where: { skillId_version: { skillId, version } },
    });
  }

  findVersionWithStorage(skillId: string, version: string) {
    return this.prisma.skillVersion.findUnique({
      where: { skillId_version: { skillId, version } },
      include: { skill: true, packageStorage: true },
    });
  }

  update(
    id: string,
    data: {
      name?: string;
      description?: string | null;
      category?: SkillCategory;
      status?: SkillStatus;
    },
  ) {
    return this.prisma.skill.update({ where: { id }, data });
  }

  createWithFirstVersion(
    manifest: { code: string; name: string; description: string | null },
    dto: SkillUploadDto,
    storageId: string,
  ) {
    return this.prisma.$transaction((tx) =>
      tx.skill.create({
        data: {
          code: manifest.code,
          name: manifest.name,
          description: manifest.description,
          currentVersion: dto.version,
          category: SkillCategory.GENERAL,
          status: SkillStatus.ACTIVE,
          versions: {
            create: {
              version: dto.version,
              changelog: dto.changelog,
              packageStorageId: storageId,
            },
          },
        },
        include: { versions: true },
      }),
    );
  }

  createVersion(skillId: string, dto: SkillUploadDto, storageId: string) {
    return this.prisma.$transaction((tx) =>
      tx.skillVersion.create({
        data: {
          skillId,
          version: dto.version,
          changelog: dto.changelog,
          packageStorageId: storageId,
        },
      }),
    );
  }

  activate(skillId: string, version: string) {
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<
        { id: string }[]
      >`SELECT id FROM skills WHERE id = ${skillId} FOR UPDATE`;
      if (!locked.length) throw new NotFoundException('技能不存在');
      const record = await tx.skillVersion.findUnique({
        where: { skillId_version: { skillId, version } },
      });
      if (!record) throw new NotFoundException('技能版本不存在');
      return tx.skill.update({
        where: { id: skillId },
        data: { currentVersion: version },
      });
    });
  }

  deleteVersion(skillId: string, version: string) {
    return this.prisma.$transaction(async (tx): Promise<SkillPackageObject> => {
      const locked = await tx.$queryRaw<
        { id: string }[]
      >`SELECT id FROM skills WHERE id = ${skillId} FOR UPDATE`;
      if (!locked.length) throw new NotFoundException('技能不存在');
      const skill = await tx.skill.findUnique({ where: { id: skillId } });
      if (skill?.currentVersion === version)
        throw new ConflictException('当前版本须先切换后才能删除');
      const record = await tx.skillVersion.findUnique({
        where: { skillId_version: { skillId, version } },
        include: { packageStorage: true },
      });
      if (!record) throw new NotFoundException('技能版本不存在');
      await tx.skillVersion.delete({ where: { id: record.id } });
      return {
        id: record.packageStorageId,
        key: record.packageStorage.objectKey,
      };
    });
  }

  delete(skillId: string) {
    return this.prisma.$transaction(
      async (tx): Promise<SkillPackageObject[]> => {
        await tx.$queryRaw`SELECT id FROM skills WHERE id = ${skillId} FOR UPDATE`;
        const skill = await tx.skill.findUnique({
          where: { id: skillId },
          include: { versions: { include: { packageStorage: true } } },
        });
        if (!skill) throw new NotFoundException('技能不存在');
        await tx.skill.delete({ where: { id: skillId } });
        return skill.versions.map((version) => ({
          id: version.packageStorageId,
          key: version.packageStorage.objectKey,
        }));
      },
    );
  }

  findUnreferencedPackages(before: Date) {
    return this.prisma.storageObject.findMany({
      where: {
        objectKey: { startsWith: 'skill-packages/' },
        skillVersionPackages: { none: {} },
        createdAt: { lt: before },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
  }

  createPackageObject(data: {
    bucket: string;
    objectKey: string;
    contentType: string;
    sizeBytes: bigint;
    checksumSha256: string;
  }) {
    return this.prisma.storageObject.create({
      data: { provider: StorageProvider.OSS, ...data },
    });
  }

  deletePackageObject(id: string) {
    return this.prisma.storageObject.delete({ where: { id } });
  }
}
