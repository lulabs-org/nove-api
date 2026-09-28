import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { createHash, randomUUID } from 'node:crypto';
import {
  Prisma,
  SkillCategory,
  SkillStatus,
  StorageProvider,
} from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import {
  OBJECT_STORAGE,
  type ObjectStorage,
} from '@/storage/object-storage.interface';
import { ListSkillsDto, SkillUploadDto, UpdateSkillDto } from './skill.dto';
import { validateSkillZip } from './skill-zip.validator';

export interface SkillUploadFile {
  buffer: Buffer;
  size: number;
  mimetype: string;
  originalname: string;
}

const ZIP_CONTENT_TYPE = 'application/zip';
const VERSION_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._+-]{0,49}$/;

@Injectable()
export class SkillService {
  private readonly logger = new Logger(SkillService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  async list(query: ListSkillsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
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
    return { items, total, page, pageSize };
  }

  async get(id: string) {
    const skill = await this.prisma.skill.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
          include: { packageStorage: true },
        },
      },
    });
    if (!skill) throw new NotFoundException('技能不存在');
    return {
      ...skill,
      versions: skill.versions.map(({ packageStorage, ...version }) => ({
        ...version,
        sizeBytes: packageStorage.sizeBytes.toString(),
        checksumSha256: packageStorage.checksumSha256,
      })),
    };
  }

  async update(id: string, dto: UpdateSkillDto) {
    const current = await this.get(id);
    if (
      dto.status === SkillStatus.ACTIVE &&
      !current.versions.some((v) => v.version === current.currentVersion)
    ) {
      throw new ConflictException('启用的技能必须有当前版本');
    }
    if (dto.name !== undefined && !dto.name.trim())
      throw new BadRequestException('技能名称不能为空');
    return this.prisma.skill.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.description !== undefined && {
          description: dto.description.trim() || null,
        }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
    });
  }

  async importZip(dto: SkillUploadDto, file?: SkillUploadFile) {
    const manifest = await this.validateUpload(dto, file);
    const existing = await this.prisma.skill.findUnique({
      where: { code: manifest.code },
    });
    if (existing) throw new ConflictException('技能编码已存在，请上传新版本');
    return this.storePackage(file!, async (tx, storageId) =>
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

  async addVersion(id: string, dto: SkillUploadDto, file?: SkillUploadFile) {
    const skill = await this.prisma.skill.findUnique({ where: { id } });
    if (!skill) throw new NotFoundException('技能不存在');
    const manifest = await this.validateUpload(dto, file);
    if (manifest.code !== skill.code)
      throw new BadRequestException('Zip 中的技能编码与目标技能不一致');
    const existing = await this.prisma.skillVersion.findUnique({
      where: { skillId_version: { skillId: id, version: dto.version } },
    });
    if (existing) throw new ConflictException('版本号已存在');
    return this.storePackage(file!, (tx, storageId) =>
      tx.skillVersion.create({
        data: {
          skillId: id,
          version: dto.version,
          changelog: dto.changelog,
          packageStorageId: storageId,
        },
      }),
    );
  }

  async activate(id: string, version: string) {
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<
        { id: string }[]
      >`SELECT id FROM skills WHERE id = ${id} FOR UPDATE`;
      if (!locked.length) throw new NotFoundException('技能不存在');
      const record = await tx.skillVersion.findUnique({
        where: { skillId_version: { skillId: id, version } },
      });
      if (!record) throw new NotFoundException('技能版本不存在');
      return tx.skill.update({
        where: { id },
        data: { currentVersion: version },
      });
    });
  }

  async download(id: string, version: string) {
    const record = await this.prisma.skillVersion.findUnique({
      where: { skillId_version: { skillId: id, version } },
      include: { skill: true, packageStorage: true },
    });
    if (!record) throw new NotFoundException('技能版本不存在');
    return {
      stream: await this.storage.getObjectStream(
        record.packageStorage.objectKey,
      ),
      fileName: `${record.skill.code}-${record.version}.zip`,
    };
  }

  async deleteVersion(id: string, version: string) {
    const object = await this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<
        { id: string }[]
      >`SELECT id FROM skills WHERE id = ${id} FOR UPDATE`;
      if (!locked.length) throw new NotFoundException('技能不存在');
      const skill = await tx.skill.findUnique({ where: { id } });
      if (skill?.currentVersion === version)
        throw new ConflictException('当前版本须先切换后才能删除');
      const record = await tx.skillVersion.findUnique({
        where: { skillId_version: { skillId: id, version } },
        include: { packageStorage: true },
      });
      if (!record) throw new NotFoundException('技能版本不存在');
      await tx.skillVersion.delete({ where: { id: record.id } });
      return {
        id: record.packageStorageId,
        key: record.packageStorage.objectKey,
      };
    });
    await this.cleanupAfterDelete([object]);
  }

  async delete(id: string) {
    const objects = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM skills WHERE id = ${id} FOR UPDATE`;
      const skill = await tx.skill.findUnique({
        where: { id },
        include: { versions: { include: { packageStorage: true } } },
      });
      if (!skill) throw new NotFoundException('技能不存在');
      await tx.skill.delete({ where: { id } });
      return skill.versions.map((v) => ({
        id: v.packageStorageId,
        key: v.packageStorage.objectKey,
      }));
    });
    await this.cleanupAfterDelete(objects);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupUnreferencedPackages() {
    const objects = await this.prisma.storageObject.findMany({
      where: {
        objectKey: { startsWith: 'skill-packages/' },
        skillVersionPackages: { none: {} },
        createdAt: { lt: new Date(Date.now() - 10 * 60 * 1000) },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });
    for (const object of objects) {
      try {
        await this.cleanupStorageObject(object.id, object.objectKey);
      } catch (error) {
        this.logger.error(
          `Failed to retry skill package cleanup: ${object.id}`,
          error,
        );
      }
    }
  }

  private async validateUpload(dto: SkillUploadDto, file?: SkillUploadFile) {
    if (!VERSION_PATTERN.test(dto.version))
      throw new BadRequestException('版本号格式无效');
    if (
      !file ||
      !file.originalname.toLowerCase().endsWith('.zip') ||
      ![
        'application/zip',
        'application/x-zip-compressed',
        'application/octet-stream',
      ].includes(file.mimetype)
    ) {
      throw new BadRequestException('请选择 Zip 文件');
    }
    return validateSkillZip(file.buffer);
  }

  private async storePackage<T>(
    file: SkillUploadFile,
    create: (tx: Prisma.TransactionClient, storageId: string) => Promise<T>,
  ): Promise<T> {
    const key = `skill-packages/${randomUUID()}.zip`;
    const checksum = createHash('sha256').update(file.buffer).digest('hex');
    const object = await this.prisma.storageObject.create({
      data: {
        provider: StorageProvider.OSS,
        bucket: this.storage.getBucket(),
        objectKey: key,
        contentType: ZIP_CONTENT_TYPE,
        sizeBytes: BigInt(file.buffer.length),
        checksumSha256: checksum,
      },
    });
    try {
      await this.storage.putObject({
        key,
        body: file.buffer,
        contentType: ZIP_CONTENT_TYPE,
        access: 'private',
      });
      return await this.prisma.$transaction((tx) => create(tx, object.id));
    } catch (error) {
      try {
        await this.cleanupStorageObject(object.id, key);
      } catch (cleanupError) {
        this.logger.error(
          `Failed to clean up skill package ${object.id}`,
          cleanupError,
        );
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('技能编码或版本号已存在');
      }
      throw error;
    }
  }

  private async cleanupStorageObject(id: string, key: string) {
    await this.storage.deleteObject(key);
    await this.prisma.storageObject.delete({ where: { id } });
  }

  private async cleanupAfterDelete(
    objects: Array<{ id: string; key: string }>,
  ) {
    let failed = false;
    for (const object of objects) {
      try {
        await this.cleanupStorageObject(object.id, object.key);
      } catch (error) {
        failed = true;
        this.logger.error(
          `Failed to delete skill package ${object.id}; scheduled cleanup will retry`,
          error,
        );
      }
    }
    if (failed)
      throw new ServiceUnavailableException(
        '技能记录已删除，Zip 清理将在后台重试',
      );
  }
}
