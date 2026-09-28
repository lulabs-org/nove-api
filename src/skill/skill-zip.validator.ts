import { BadRequestException } from '@nestjs/common';
import { load } from 'js-yaml';
import { fromBuffer, type Entry, type ZipFile } from 'yauzl';

export const MAX_SKILL_ZIP_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 200;
const MAX_UNCOMPRESSED_BYTES = 50 * 1024 * 1024;
const MAX_MANIFEST_BYTES = 1024 * 1024;

export interface SkillManifest {
  code: string;
  name: string;
  description: string | null;
}

function parseManifest(content: string): SkillManifest {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(content);
  if (!match) throw new BadRequestException('SKILL.md 缺少合法的 Frontmatter');

  let value: unknown;
  try {
    value = load(match[1]);
  } catch {
    throw new BadRequestException('SKILL.md Frontmatter 格式无效');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('SKILL.md Frontmatter 必须为对象');
  }
  const fields = value as Record<string, unknown>;
  if (
    typeof fields.name !== 'string' ||
    !/^[a-z0-9][a-z0-9_-]{0,99}$/.test(fields.name) ||
    typeof fields.description !== 'string' ||
    !fields.description.trim()
  ) {
    throw new BadRequestException(
      'SKILL.md 必须包含合法的 name 和 description',
    );
  }
  return {
    code: fields.name,
    name: fields.name,
    description: fields.description.trim(),
  };
}

function safePath(entry: Entry): boolean {
  const path = entry.fileName;
  if (
    !path ||
    path.startsWith('/') ||
    path.includes('\\') ||
    /^[a-zA-Z]:/.test(path) ||
    path.includes('\0') ||
    path.split('/').some((segment) => segment === '.' || segment === '..')
  )
    return false;
  const mode = (entry.externalFileAttributes >>> 16) & 0o170000;
  return (
    mode !== 0o120000 && (mode === 0 || mode === 0o100000 || mode === 0o040000)
  );
}

function readEntry(
  zip: ZipFile,
  entry: Entry,
  capture: boolean,
): Promise<string> {
  return new Promise((resolve, reject) => {
    zip.openReadStream(entry, (error, stream) => {
      if (error) return reject(error);
      const chunks: Buffer[] = [];
      let size = 0;
      stream.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (
          size > entry.uncompressedSize ||
          (capture && size > MAX_MANIFEST_BYTES)
        ) {
          stream.destroy(new Error('Zip entry exceeds declared size'));
          return;
        }
        if (capture) chunks.push(chunk);
      });
      stream.on('error', reject);
      stream.on('end', () =>
        resolve(capture ? Buffer.concat(chunks).toString('utf8') : ''),
      );
    });
  });
}

export async function validateSkillZip(buffer: Buffer): Promise<SkillManifest> {
  if (
    buffer.length < 4 ||
    buffer.length > MAX_SKILL_ZIP_BYTES ||
    buffer.readUInt32LE(0) !== 0x04034b50
  ) {
    throw new BadRequestException('只接受不超过 10 MB 的 Zip 文件');
  }

  return new Promise((resolve, reject) => {
    fromBuffer(
      buffer,
      { lazyEntries: true, validateEntrySizes: true },
      (openError, zip) => {
        if (openError) return reject(new BadRequestException('Zip 文件无效'));
        let count = 0;
        let totalSize = 0;
        let manifest: SkillManifest | null = null;
        let manifestCount = 0;
        const paths = new Set<string>();
        let settled = false;
        const fail = (message: string) => {
          if (settled) return;
          settled = true;
          zip.close();
          reject(new BadRequestException(message));
        };
        zip.on('error', () => fail('Zip 文件损坏或包含无效条目'));
        zip.on('entry', (entry) => {
          count++;
          totalSize += entry.uncompressedSize;
          if (
            !safePath(entry) ||
            entry.isEncrypted() ||
            paths.has(entry.fileName)
          )
            return fail('Zip 包含不安全或重复的路径');
          paths.add(entry.fileName);
          if (count > MAX_FILES || totalSize > MAX_UNCOMPRESSED_BYTES) {
            return fail('Zip 文件数量或解压后大小超出限制');
          }
          const isManifest = /(^|\/)SKILL\.md$/.test(entry.fileName);
          if (isManifest) {
            manifestCount++;
            if (
              manifestCount > 1 ||
              entry.uncompressedSize > MAX_MANIFEST_BYTES
            ) {
              return fail('Zip 必须包含唯一且不超过 1 MB 的 SKILL.md');
            }
          }
          void readEntry(zip, entry, isManifest)
            .then((content) => {
              try {
                if (isManifest) manifest = parseManifest(content);
                zip.readEntry();
              } catch {
                fail('SKILL.md Frontmatter 无效');
              }
            })
            .catch(() => fail('Zip 条目无法读取'));
        });
        zip.on('end', () => {
          if (settled) return;
          settled = true;
          if (!manifest)
            return reject(new BadRequestException('Zip 缺少合法的 SKILL.md'));
          resolve(manifest);
        });
        zip.readEntry();
      },
    );
  });
}
