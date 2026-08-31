import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import * as OSSModule from 'ali-oss';
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

const OSS = OSSModule as unknown as OssClientConstructor;

@Injectable()
export class AliyunOssStorageService implements ObjectStorage {
  private client: OssClient | null = null;

  async putObject(input: PutObjectInput): Promise<StoredObject> {
    const url = this.buildPublicUrl(input.key);
    const client = this.getClient();
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
    await this.getClient().delete(key);
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

    const expires = this.getSignedUrlExpiresSeconds();
    return this.getClient().signatureUrl(key, {
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
    const bucket = process.env.ALIYUN_OSS_BUCKET?.trim();
    if (!bucket) {
      throw new ServiceUnavailableException('对象存储 Bucket 尚未配置');
    }
    return bucket;
  }

  async createMultipartUpload(input: {
    key: string;
    contentType: string;
  }): Promise<{ uploadId: string }> {
    try {
      return await this.getClient().initMultipartUpload(input.key, {
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
    return this.getClient().signatureUrl(input.key, {
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
    await this.getClient().completeMultipartUpload(
      input.key,
      input.uploadId,
      input.parts,
    );
  }

  async abortMultipartUpload(input: {
    key: string;
    uploadId: string;
  }): Promise<void> {
    await this.getClient().abortMultipartUpload(input.key, input.uploadId);
  }

  async headObject(key: string): Promise<{
    sizeBytes: number;
    contentType?: string;
    etag?: string;
  }> {
    const result = await this.getClient().head(key);
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
    const result = await this.getClient().get(key, {
      headers: { Range: `bytes=${range.start}-${range.end}` },
    });
    return result.content;
  }

  async getObjectStream(key: string): Promise<Readable> {
    const result = await this.getClient().getStream(key);
    return result.stream;
  }

  getDownloadUrl(input: {
    key: string;
    fileName: string;
    contentType: string;
    expiresSeconds: number;
  }): string {
    const safeName = input.fileName.replace(/[\r\n"\\]/g, '_');
    return this.getClient().signatureUrl(input.key, {
      method: 'GET',
      expires: input.expiresSeconds,
      response: {
        'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(safeName)}`,
        'cache-control': 'private, no-store',
      },
    });
  }

  private getClient(): OssClient {
    if (this.client) return this.client;

    const region = process.env.ALIYUN_OSS_REGION?.trim();
    const bucket = process.env.ALIYUN_OSS_BUCKET?.trim();
    const accessKeyId = process.env.ALIBABA_CLOUD_ACCESS_KEY_ID?.trim();
    const accessKeySecret = process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET?.trim();

    if (!region || !bucket || !accessKeyId || !accessKeySecret) {
      throw new ServiceUnavailableException('头像存储服务尚未配置');
    }

    this.client = new OSS({
      region,
      bucket,
      accessKeyId,
      accessKeySecret,
      secure: true,
    });
    return this.client;
  }

  private buildPublicUrl(key: string): string {
    const publicBaseUrl = this.getPublicBaseUrl();
    if (!publicBaseUrl) {
      throw new ServiceUnavailableException('头像公开访问地址尚未配置');
    }
    return `${publicBaseUrl}/${key}`;
  }

  private getPublicBaseUrl(): string | null {
    return (
      process.env.ALIYUN_OSS_PUBLIC_BASE_URL?.trim().replace(/\/+$/, '') || null
    );
  }

  private getSignedUrlExpiresSeconds(): number {
    const configured = Number(
      process.env.ALIYUN_OSS_SIGNED_URL_EXPIRES_SECONDS?.trim() || 600,
    );
    if (!Number.isInteger(configured) || configured < 60 || configured > 3600) {
      return 600;
    }
    return configured;
  }
}
