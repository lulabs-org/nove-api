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
import { Prisma, SkillStatus } from '@/generated/prisma/client';
import { OBJECT_STORAGE, type ObjectStorage } from '@/storage';
import { ListSkillsDto, SkillUploadDto, UpdateSkillDto } from './skill.dto';
import { validateSkillZip } from './skill-zip.validator';
import { SkillRepository, type SkillPackageObject } from './skill.repository';

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
    private readonly repository: SkillRepository,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  async list(query: ListSkillsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const { items, total } = await this.repository.list(query, page, pageSize);
    return { items, total, page, pageSize };
  }

  async get(id: string) {
    const skill = await this.repository.findWithVersions(id);
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
    return this.repository.update(id, {
      ...(dto.name !== undefined && { name: dto.name.trim() }),
      ...(dto.description !== undefined && {
        description: dto.description.trim() || null,
      }),
      ...(dto.category !== undefined && { category: dto.category }),
      ...(dto.status !== undefined && { status: dto.status }),
    });
  }

  async importZip(dto: SkillUploadDto, file?: SkillUploadFile) {
    const manifest = await this.validateUpload(dto, file);
    const existing = await this.repository.findByCode(manifest.code);
    if (existing) throw new ConflictException('技能编码已存在，请上传新版本');
    return this.storePackage(file!, (storageId) =>
      this.repository.createWithFirstVersion(manifest, dto, storageId),
    );
  }

  async addVersion(id: string, dto: SkillUploadDto, file?: SkillUploadFile) {
    const skill = await this.repository.findById(id);
    if (!skill) throw new NotFoundException('技能不存在');
    const manifest = await this.validateUpload(dto, file);
    if (manifest.code !== skill.code)
      throw new BadRequestException('Zip 中的技能编码与目标技能不一致');
    const existing = await this.repository.findVersion(id, dto.version);
    if (existing) throw new ConflictException('版本号已存在');
    return this.storePackage(file!, (storageId) =>
      this.repository.createVersion(id, dto, storageId),
    );
  }

  async activate(id: string, version: string) {
    return this.repository.activate(id, version);
  }

  async download(id: string, version: string) {
    const record = await this.repository.findVersionWithStorage(id, version);
    if (!record) throw new NotFoundException('技能版本不存在');
    return {
      stream: await this.storage.getObjectStream(
        record.packageStorage.objectKey,
      ),
      fileName: `${record.skill.code}-${record.version}.zip`,
    };
  }

  async deleteVersion(id: string, version: string) {
    const object = await this.repository.deleteVersion(id, version);
    await this.cleanupAfterDelete([object]);
  }

  async delete(id: string) {
    const objects = await this.repository.delete(id);
    await this.cleanupAfterDelete(objects);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupUnreferencedPackages() {
    const objects = await this.repository.findUnreferencedPackages(
      new Date(Date.now() - 10 * 60 * 1000),
    );
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
    create: (storageId: string) => Promise<T>,
  ): Promise<T> {
    const key = `skill-packages/${randomUUID()}.zip`;
    const checksum = createHash('sha256').update(file.buffer).digest('hex');
    const object = await this.repository.createPackageObject({
      bucket: this.storage.getBucket(),
      objectKey: key,
      contentType: ZIP_CONTENT_TYPE,
      sizeBytes: BigInt(file.buffer.length),
      checksumSha256: checksum,
    });
    try {
      await this.storage.putObject({
        key,
        body: file.buffer,
        contentType: ZIP_CONTENT_TYPE,
        access: 'private',
      });
      return await create(object.id);
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
    await this.repository.deletePackageObject(id);
  }

  private async cleanupAfterDelete(objects: SkillPackageObject[]) {
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
