import type { Readable } from 'node:stream';

export const OBJECT_STORAGE = Symbol('OBJECT_STORAGE');

export interface PutObjectInput {
  key: string;
  body: Buffer;
  contentType: string;
  cacheControl?: string;
  access?: 'private';
}

export interface StoredObject {
  key: string;
  url: string;
}

export interface MultipartUploadPart {
  number: number;
  etag: string;
}

export interface ObjectHead {
  sizeBytes: number;
  contentType?: string;
  etag?: string;
}

export interface ObjectByteRange {
  start: number;
  end: number;
}

export interface ObjectStorage {
  putObject(input: PutObjectInput): Promise<StoredObject>;
  deleteObject(key: string): Promise<void>;
  getManagedKey(url: string): string | null;
  getReadUrl(url: string): string;
  getProvider(): 'OSS';
  getBucket(): string;
  createMultipartUpload(input: {
    key: string;
    contentType: string;
  }): Promise<{ uploadId: string }>;
  getUploadPartUrl(input: {
    key: string;
    uploadId: string;
    partNumber: number;
    expiresSeconds: number;
  }): string;
  completeMultipartUpload(input: {
    key: string;
    uploadId: string;
    parts: MultipartUploadPart[];
  }): Promise<void>;
  abortMultipartUpload(input: { key: string; uploadId: string }): Promise<void>;
  headObject(key: string): Promise<ObjectHead>;
  getObjectBytes(key: string, range: ObjectByteRange): Promise<Buffer>;
  getObjectStream(key: string): Promise<Readable>;
  getDownloadUrl(input: {
    key: string;
    fileName: string;
    contentType: string;
    expiresSeconds: number;
  }): string;
}
