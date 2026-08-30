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

export interface ObjectStorage {
  putObject(input: PutObjectInput): Promise<StoredObject>;
  deleteObject(key: string): Promise<void>;
  getManagedKey(url: string): string | null;
  getReadUrl(url: string): string;
}
