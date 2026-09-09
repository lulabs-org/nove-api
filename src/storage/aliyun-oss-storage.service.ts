import {
  Injectable,
  Logger,
  OnModuleInit,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  IntegrationChangeEvent,
  INTEGRATION_EVENT_PATTERNS,
  IntegrationsService,
} from '@/admin/integrations';
import { SingleOrgContextService } from '@/admin/org';
import {
  ObjectStorage,
  PutObjectInput,
  StoredObject,
} from './object-storage.interface';
import type { Readable } from 'node:stream';

interface OssClient {
  put(
    key: string,
    body: Buffer,
    options: { headers: Record<string, string> },
  ): Promise<unknown>;
  delete(key: string): Promise<unknown>;
  signatureUrl(
    key: string,
    options: {
      expires: number;
      method: 'GET' | 'PUT';
      response: Record<string, string>;
      subResource?: Record<string, string | number>;
    },
  ): string;
  initMultipartUpload(
    key: string,
    options: { mime: string; headers: Record<string, string> },
  ): Promise<{ uploadId: string }>;
  completeMultipartUpload(
    key: string,
    uploadId: string,
    parts: Array<{ number: number; etag: string }>,
  ): Promise<unknown>;
  abortMultipartUpload(key: string, uploadId: string): Promise<unknown>;
  head(key: string): Promise<{
    meta?: { contentType?: string };
    res?: { headers?: Record<string, string>; size?: number };
  }>;
  get(
    key: string,
    options: { headers: { Range: string } },
  ): Promise<{ content: Buffer }>;
  getStream(key: string): Promise<{ stream: Readable }>;
}

interface OssClientConstructor {
  new (options: {
    region: string;
    bucket: string;
    accessKeyId: string;
    accessKeySecret: string;
    secure: boolean;
  }): OssClient;
}

function getOssConstructor(): OssClientConstructor {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const OSSModule = require('ali-oss') as unknown;
  return (
    typeof OSSModule === 'object' &&
    OSSModule !== null &&
    'default' in OSSModule
      ? (OSSModule as { default: unknown }).default
      : OSSModule
  ) as OssClientConstructor;
}

interface StorageEffectiveConfig {
  region: string;
  bucket: string;
  publicBucket: string;
  accessKeyId: string;
  accessKeySecret: string;
  publicBaseUrl: string | null;
  signedUrlExpiresSeconds: number;
}

@Injectable()
export class AliyunOssStorageService implements ObjectStorage, OnModuleInit {
  private readonly logger = new Logger(AliyunOssStorageService.name);
  private client: OssClient | null = null;
  private privateClient: OssClient | null = null;
  private publicClient: OssClient | null = null;
  private integrationsConfig: StorageEffectiveConfig | null = null;

  constructor(
    @Optional() private readonly integrationsService?: IntegrationsService,
    @Optional() private readonly orgContext?: SingleOrgContextService,
  ) {}

  async onModuleInit() {
    await this.reloadConfig();
  }

  @OnEvent(INTEGRATION_EVENT_PATTERNS.STORAGE_UPDATED)
  async handleStorageConfigUpdate(event: IntegrationChangeEvent) {
    if (this.orgContext && !this.orgContext.matches(event.orgId)) return;
    this.logger.log(
      'Received config.storage.updated event, reloading OSS client...',
    );
    await this.reloadConfig();
  }

  @OnEvent(INTEGRATION_EVENT_PATTERNS.STORAGE_DELETED)
  async handleStorageConfigDelete(event: IntegrationChangeEvent) {
    if (this.orgContext && !this.orgContext.matches(event.orgId)) return;
    this.logger.log(
      'Received config.storage.deleted event, resetting OSS client to defaults...',
    );
    await this.reloadConfig();
  }

  async reloadConfig() {
    let effectiveConfig: StorageEffectiveConfig | null = null;
    if (this.integrationsService && this.orgContext) {
      try {
        const orgId = this.orgContext.getOrgId();
        const effective = await this.integrationsService.getEffectiveConfig(
          orgId,
          'storage',
        );
        const dynamicConfig = (effective?.value ?? {}) as Record<
          string,
          unknown
        >;
        const bucket = String(dynamicConfig.bucket ?? '').trim();
        const accessKeyId = String(dynamicConfig.accessKeyId ?? '').trim();
        const accessKeySecret = String(
          dynamicConfig.accessKeySecret ?? '',
        ).trim();

        if (bucket && accessKeyId && accessKeySecret) {
          const publicBucket =
            String(dynamicConfig.publicBucket ?? '').trim() || bucket;
          effectiveConfig = {
            region:
              String(dynamicConfig.region ?? '').trim() || 'oss-cn-hangzhou',
            bucket,
            publicBucket,
            accessKeyId,
            accessKeySecret,
            publicBaseUrl:
              String(dynamicConfig.publicBaseUrl ?? '')
                .trim()
                .replace(/\/+$/, '') || null,
            signedUrlExpiresSeconds: this.normalizeExpiresSeconds(
              dynamicConfig.signedUrlExpiresSeconds,
            ),
          };
        }
      } catch {
        // Uninitialized org context
      }
    }

    this.integrationsConfig = effectiveConfig;
    this.client = null;
    this.privateClient = null;
    this.publicClient = null;
  }

  async putObject(input: PutObjectInput): Promise<StoredObject> {
    const url = this.buildPublicUrl(input.key);
    const client = this.getPublicClient();
    try {
      await client.put(input.key, input.body, {
        headers: {
          'Content-Type': input.contentType,
          ...(input.cacheControl
            ? { 'Cache-Control': input.cacheControl }
            : {}),
          ...(input.access ? { 'x-oss-object-acl': input.access } : {}),
        },
      });
    } catch {
      throw new ServiceUnavailableException('头像存储服务暂时不可用');
    }

    return {
      key: input.key,
      url,
    };
  }

  async deleteObject(key: string): Promise<void> {
    const client = key.startsWith('avatars/')
      ? this.getPublicClient()
      : this.getPrivateClient();
    await client.delete(key);
  }

  getManagedKey(url: string): string | null {
    const publicBaseUrl = this.getPublicBaseUrl();
    if (!publicBaseUrl) return null;

    try {
      const base = new URL(`${publicBaseUrl}/`);
      const candidate = new URL(url);
      if (candidate.origin !== base.origin) return null;

      const basePath = base.pathname.replace(/^\/+|\/+$/g, '');
      const candidatePath = decodeURIComponent(
        candidate.pathname.replace(/^\/+/, ''),
      );
      const key = basePath
        ? candidatePath.startsWith(`${basePath}/`)
          ? candidatePath.slice(basePath.length + 1)
          : null
        : candidatePath;

      return key?.startsWith('avatars/') ? key : null;
    } catch {
      return null;
    }
  }

  getReadUrl(url: string): string {
    const key = this.getManagedKey(url);
    if (!key) return url;

    const config = this.getActiveConfig();
    const isIndependentPublic = Boolean(
      config.publicBucket && config.publicBucket !== config.bucket,
    );
    if (isIndependentPublic) {
      return url;
    }

    const expires = this.getSignedUrlExpiresSeconds();
    return this.getPublicClient().signatureUrl(key, {
      expires,
      method: 'GET',
      response: {
        'cache-control': `private, max-age=${expires}`,
      },
    });
  }

  getProvider(): 'OSS' {
    return 'OSS';
  }

  getBucket(): string {
    const bucket = this.getActiveConfig().bucket;
    if (!bucket) {
      throw new ServiceUnavailableException('对象存储 Bucket 尚未配置');
    }
    return bucket;
  }

  getPublicBucket(): string {
    return this.getActiveConfig().publicBucket;
  }

  async createMultipartUpload(input: {
    key: string;
    contentType: string;
  }): Promise<{ uploadId: string }> {
    try {
      return await this.getPrivateClient().initMultipartUpload(input.key, {
        mime: input.contentType,
        headers: { 'x-oss-object-acl': 'private' },
      });
    } catch {
      throw new ServiceUnavailableException('无法创建分片上传会话');
    }
  }

  getUploadPartUrl(input: {
    key: string;
    uploadId: string;
    partNumber: number;
    expiresSeconds: number;
  }): string {
    return this.getPrivateClient().signatureUrl(input.key, {
      method: 'PUT',
      expires: input.expiresSeconds,
      response: {},
      subResource: {
        uploadId: input.uploadId,
        partNumber: input.partNumber,
      },
    });
  }

  async completeMultipartUpload(input: {
    key: string;
    uploadId: string;
    parts: Array<{ number: number; etag: string }>;
  }): Promise<void> {
    await this.getPrivateClient().completeMultipartUpload(
      input.key,
      input.uploadId,
      input.parts,
    );
  }

  async abortMultipartUpload(input: {
    key: string;
    uploadId: string;
  }): Promise<void> {
    await this.getPrivateClient().abortMultipartUpload(
      input.key,
      input.uploadId,
    );
  }

  async headObject(key: string): Promise<{
    sizeBytes: number;
    contentType?: string;
    etag?: string;
  }> {
    const result = await this.getPrivateClient().head(key);
    const headers = result.res?.headers ?? {};
    return {
      sizeBytes: Number(headers['content-length'] ?? result.res?.size ?? 0),
      contentType: headers['content-type'] ?? result.meta?.contentType,
      etag: headers.etag,
    };
  }

  async getObjectBytes(
    key: string,
    range: { start: number; end: number },
  ): Promise<Buffer> {
    const result = await this.getPrivateClient().get(key, {
      headers: { Range: `bytes=${range.start}-${range.end}` },
    });
    return result.content;
  }

  async getObjectStream(key: string): Promise<Readable> {
    const result = await this.getPrivateClient().getStream(key);
    return result.stream;
  }

  getDownloadUrl(input: {
    key: string;
    fileName: string;
    contentType: string;
    expiresSeconds: number;
  }): string {
    const safeName = input.fileName.replace(/[\r\n"\\]/g, '_');
    return this.getPrivateClient().signatureUrl(input.key, {
      method: 'GET',
      expires: input.expiresSeconds,
      response: {
        'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(safeName)}`,
        'cache-control': 'private, no-store',
      },
    });
  }

  private getPrivateClient(): OssClient {
    if (this.client) return this.client;
    if (this.privateClient) return this.privateClient;

    const { region, bucket, accessKeyId, accessKeySecret } =
      this.getActiveConfig();

    if (!region || !bucket || !accessKeyId || !accessKeySecret) {
      throw new ServiceUnavailableException('对象存储服务尚未配置');
    }

    const OSS = getOssConstructor();
    this.privateClient = new OSS({
      region,
      bucket,
      accessKeyId,
      accessKeySecret,
      secure: true,
    });
    return this.privateClient;
  }

  private getPublicClient(): OssClient {
    if (this.client) return this.client;
    if (this.publicClient) return this.publicClient;

    const { region, publicBucket, bucket, accessKeyId, accessKeySecret } =
      this.getActiveConfig();

    const targetBucket = publicBucket || bucket;

    if (!region || !targetBucket || !accessKeyId || !accessKeySecret) {
      throw new ServiceUnavailableException('头像存储服务尚未配置');
    }

    if (targetBucket === bucket && this.privateClient) {
      this.publicClient = this.privateClient;
      return this.publicClient;
    }

    const OSS = getOssConstructor();
    this.publicClient = new OSS({
      region,
      bucket: targetBucket,
      accessKeyId,
      accessKeySecret,
      secure: true,
    });
    return this.publicClient;
  }

  private getClient(): OssClient {
    return this.getPrivateClient();
  }

  private buildPublicUrl(key: string): string {
    const publicBaseUrl = this.getPublicBaseUrl();
    if (!publicBaseUrl) {
      throw new ServiceUnavailableException('头像公开访问地址尚未配置');
    }
    return `${publicBaseUrl}/${key}`;
  }

  private getPublicBaseUrl(): string | null {
    return this.getActiveConfig().publicBaseUrl;
  }

  private getSignedUrlExpiresSeconds(): number {
    return this.getActiveConfig().signedUrlExpiresSeconds;
  }

  private normalizeExpiresSeconds(configuredVal: unknown): number {
    const configured = Number(configuredVal || 600);
    if (!Number.isInteger(configured) || configured < 60 || configured > 3600) {
      return 600;
    }
    return configured;
  }

  private getActiveConfig(): StorageEffectiveConfig {
    if (this.integrationsConfig) {
      return this.integrationsConfig;
    }
    return {
      region: 'oss-cn-hangzhou',
      bucket: '',
      publicBucket: '',
      accessKeyId: '',
      accessKeySecret: '',
      publicBaseUrl: null,
      signedUrlExpiresSeconds: 600,
    };
  }
}
