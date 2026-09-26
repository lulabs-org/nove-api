import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { OrganizationDto } from '@/admin/org/dto';
import { OrganizationService } from '@/admin/org/services/organization.service';
import { sharpFactory } from '@/common/utils/sharp-factory';
import {
  OBJECT_STORAGE,
  ObjectStorage,
  StoredObject,
} from './object-storage.interface';
import { OrganizationProfileDto } from './organization-profile.dto';

export interface OrganizationLogoUploadFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
}
const FORMAT_MIME_TYPES: Record<string, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

@Injectable()
export class OrganizationProfileService {
  private readonly logger = new Logger(OrganizationProfileService.name);

  constructor(
    private readonly organizations: OrganizationService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  async save(
    orgId: string,
    dto: OrganizationProfileDto,
    file?: OrganizationLogoUploadFile,
  ) {
    if (file && dto.logoAction === 'remove') {
      throw new BadRequestException('不能同时上传和移除 Logo');
    }
    const current = await this.organizations.getOrganization(orgId);
    let stored: StoredObject | undefined;
    if (file) {
      const body = await this.processImage(file);
      stored = await this.storage.putObject({
        key: `organization-logos/${orgId}/${randomUUID()}.webp`,
        body,
        contentType: 'image/webp',
        cacheControl: 'public, max-age=31536000, immutable',
        access: 'public-read',
      });
    }
    const { logoAction, ...fields } = dto;
    let updated: OrganizationDto;
    try {
      // Persist the form and logo together; failed writes leave the previous logo intact.
      updated = await this.organizations.updateOrganization(orgId, {
        ...fields,
        ...(stored
          ? { logo: stored.url }
          : logoAction === 'remove'
            ? { logo: '' }
            : {}),
      });
    } catch (error) {
      if (stored) await this.deleteQuietly(stored.key);
      throw error;
    }
    if ((stored || logoAction === 'remove') && current.logo) {
      const oldKey = this.storage.getManagedKey(current.logo);
      if (
        oldKey?.startsWith(`organization-logos/${orgId}/`) &&
        oldKey !== stored?.key
      ) {
        await this.deleteQuietly(oldKey);
      }
    }
    return updated;
  }

  private async processImage(
    file: OrganizationLogoUploadFile,
  ): Promise<Buffer> {
    if (file.size > 5 * 1024 * 1024)
      throw new BadRequestException('Logo 文件不能超过 5 MB');
    if (!Object.values(FORMAT_MIME_TYPES).includes(file.mimetype)) {
      throw new BadRequestException('Logo 仅支持 JPEG、PNG 或 WebP 格式');
    }
    try {
      const image = sharpFactory(file.buffer, {
        failOn: 'warning',
        limitInputPixels: 20_000_000,
      });
      const metadata = await image.metadata();
      if (
        !metadata.format ||
        FORMAT_MIME_TYPES[metadata.format] !== file.mimetype
      ) {
        throw new Error('Image MIME type does not match its contents');
      }
      return await image
        .rotate()
        .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 90 })
        .toBuffer();
    } catch {
      throw new BadRequestException(
        'Logo 文件无法解析、格式不受支持或图片尺寸过大',
      );
    }
  }

  private async deleteQuietly(key: string) {
    try {
      await this.storage.deleteObject(key);
    } catch (error) {
      this.logger.warn(
        `清理企业 Logo 失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
