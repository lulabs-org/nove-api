import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import * as OSSModule from 'ali-oss';
import {
  ObjectStorage,
  PutObjectInput,
  StoredObject,
} from './object-storage.interface';

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
      method: 'GET';
      response: Record<string, string>;
    },
  ): string;
}

interface OssClientConstructor {
  new (options: {
    region: string;
    bucket: string;
    accessKeyId: string;
    accessKeySecret: string;
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

  private getClient(): OssClient {
    if (this.client) return this.client;

    const region = process.env.ALIYUN_OSS_REGION?.trim();
    const bucket = process.env.ALIYUN_OSS_BUCKET?.trim();
    const accessKeyId = process.env.ALIBABA_CLOUD_ACCESS_KEY_ID?.trim();
    const accessKeySecret = process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET?.trim();

    if (!region || !bucket || !accessKeyId || !accessKeySecret) {
      throw new ServiceUnavailableException('头像存储服务尚未配置');
    }

    this.client = new OSS({ region, bucket, accessKeyId, accessKeySecret });
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
