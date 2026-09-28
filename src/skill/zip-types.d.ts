declare module 'yauzl' {
  import type { Readable } from 'node:stream';

  export interface Entry {
    fileName: string;
    uncompressedSize: number;
    externalFileAttributes: number;
    isEncrypted(): boolean;
  }

  export interface ZipFile {
    on(event: 'entry', listener: (entry: Entry) => void): this;
    on(event: 'end', listener: () => void): this;
    on(event: 'error', listener: (error: Error) => void): this;
    readEntry(): void;
    close(): void;
    openReadStream(
      entry: Entry,
      callback: (error: Error | null, stream: Readable) => void,
    ): void;
  }

  export function fromBuffer(
    buffer: Buffer,
    options: { lazyEntries: boolean; validateEntrySizes: boolean },
    callback: (error: Error | null, zip: ZipFile) => void,
  ): void;
}

declare module 'js-yaml' {
  export function load(input: string): unknown;
}
