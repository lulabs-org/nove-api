import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { IntegrationsService } from '@/admin/integrations';
import { sharpFactory } from '@/common/utils/sharp-factory';
import { OBJECT_STORAGE, ObjectStorage } from './object-storage.interface';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_INPUT_PIXELS = 20_000_000;
const MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const FORMAT_MIME_TYPES: Record<string, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export interface MailBrandLogoUploadFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

@Injectable()
export class MailBrandLogoService {
  private readonly logger = new Logger(MailBrandLogoService.name);

  constructor(
    private readonly integrationsService: IntegrationsService,
    @Inject(OBJECT_STORAGE)
    private readonly objectStorage: ObjectStorage,
  ) {}

  async upload(orgId: string, file?: MailBrandLogoUploadFile) {
    if (!file) {
      throw new BadRequestException('请选择要上传的邮件品牌 Logo');
    }
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('Logo 文件不能超过 5 MB');
    }
    if (!MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Logo 仅支持 JPEG、PNG 或 WebP 格式');
    }

    const current = await this.integrationsService.getEffectiveConfig(
      orgId,
      'mail',
    );
    const previousUrl = this.getLogoUrl(current.value.brandLogoUrl);
    const body = await this.processImage(file.buffer, file.mimetype);
    const key = `mail-brand-logos/${orgId}/${randomUUID()}.webp`;
    const stored = await this.objectStorage.putObject({
      key,
      body,
      contentType: 'image/webp',
      cacheControl: 'public, max-age=31536000, immutable',
      access: 'public-read',
    });

    try {
      await this.integrationsService.updateIntegration(orgId, 'mail', {
        brandLogoUrl: stored.url,
      });
    } catch (error) {
      await this.deleteObjectQuietly(stored.key, '回收未关联的新邮件品牌 Logo');
      throw error;
    }

    await this.deletePreviousLogo(orgId, previousUrl, stored.key);
    return { url: stored.url };
  }

  async remove(orgId: string) {
    const current = await this.integrationsService.getEffectiveConfig(
      orgId,
      'mail',
    );
    const previousUrl = this.getLogoUrl(current.value.brandLogoUrl);

    await this.integrationsService.updateIntegration(orgId, 'mail', {
      brandLogoUrl: '',
    });
    await this.deletePreviousLogo(orgId, previousUrl);
    return { url: null };
  }

  private getLogoUrl(value: unknown): string | null {
    return typeof value === 'string' && value ? value : null;
  }

  private async processImage(
    buffer: Buffer,
    declaredMimeType: string,
  ): Promise<Buffer> {
    try {
      const image = sharpFactory(buffer, {
        failOn: 'warning',
        limitInputPixels: MAX_INPUT_PIXELS,
      });
      const metadata = await image.metadata();
      if (
        !metadata.format ||
        FORMAT_MIME_TYPES[metadata.format] !== declaredMimeType
      ) {
        throw new Error('image MIME type does not match its contents');
      }

      return await image
        .rotate()
        .resize(720, 224, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 90 })
        .toBuffer();
    } catch {
      throw new BadRequestException(
        'Logo 文件无法解析、格式不受支持或图片尺寸过大',
      );
    }
  }

  private async deletePreviousLogo(
    orgId: string,
    url: string | null,
    replacementKey?: string,
  ): Promise<void> {
    if (!url) return;
    const key = this.objectStorage.getManagedKey(url);
    if (
      !key?.startsWith(`mail-brand-logos/${orgId}/`) ||
      key === replacementKey
    ) {
      return;
    }
    await this.deleteObjectQuietly(key, '清理旧邮件品牌 Logo');
  }

  private async deleteObjectQuietly(
    key: string,
    action: string,
  ): Promise<void> {
    try {
      await this.objectStorage.deleteObject(key);
    } catch (error) {
      this.logger.warn(
        `${action}失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
