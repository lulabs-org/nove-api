import { BadRequestException, Injectable } from '@nestjs/common';
import { extname } from 'node:path';
import { SystemConfigService } from '@/admin/system-config/system-config.service';

interface FileRule {
  mimeTypes: readonly string[];
  maxBytes: bigint;
  magic:
    | 'jpeg'
    | 'png'
    | 'webp'
    | 'gif'
    | 'pdf'
    | 'docx'
    | 'xlsx'
    | 'pptx'
    | 'text'
    | 'mp3'
    | 'mp4'
    | 'wav'
    | 'aac'
    | 'ogg'
    | 'webm';
}

const MiB = 1024n * 1024n;
const GiB = 1024n * MiB;

const RULES: Record<string, FileRule> = {
  '.jpg': { mimeTypes: ['image/jpeg'], maxBytes: 20n * MiB, magic: 'jpeg' },
  '.jpeg': { mimeTypes: ['image/jpeg'], maxBytes: 20n * MiB, magic: 'jpeg' },
  '.png': { mimeTypes: ['image/png'], maxBytes: 20n * MiB, magic: 'png' },
  '.webp': { mimeTypes: ['image/webp'], maxBytes: 20n * MiB, magic: 'webp' },
  '.gif': { mimeTypes: ['image/gif'], maxBytes: 20n * MiB, magic: 'gif' },
  '.svg': { mimeTypes: ['image/svg+xml'], maxBytes: 20n * MiB, magic: 'text' },
  '.html': { mimeTypes: ['text/html'], maxBytes: 100n * MiB, magic: 'text' },
  '.htm': { mimeTypes: ['text/html'], maxBytes: 100n * MiB, magic: 'text' },
  '.pdf': {
    mimeTypes: ['application/pdf'],
    maxBytes: 100n * MiB,
    magic: 'pdf',
  },
  '.docx': {
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    maxBytes: 100n * MiB,
    magic: 'docx',
  },
  '.xlsx': {
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    maxBytes: 100n * MiB,
    magic: 'xlsx',
  },
  '.pptx': {
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
    maxBytes: 100n * MiB,
    magic: 'pptx',
  },
  '.txt': { mimeTypes: ['text/plain'], maxBytes: 100n * MiB, magic: 'text' },
  '.md': {
    mimeTypes: ['text/markdown', 'text/plain'],
    maxBytes: 100n * MiB,
    magic: 'text',
  },
  '.csv': {
    mimeTypes: ['text/csv', 'text/plain', 'application/csv'],
    maxBytes: 100n * MiB,
    magic: 'text',
  },
  '.mp3': { mimeTypes: ['audio/mpeg'], maxBytes: 2n * GiB, magic: 'mp3' },
  '.m4a': {
    mimeTypes: ['audio/mp4', 'audio/x-m4a'],
    maxBytes: 2n * GiB,
    magic: 'mp4',
  },
  '.wav': {
    mimeTypes: ['audio/wav', 'audio/x-wav'],
    maxBytes: 2n * GiB,
    magic: 'wav',
  },
  '.aac': { mimeTypes: ['audio/aac'], maxBytes: 2n * GiB, magic: 'aac' },
  '.ogg': { mimeTypes: ['audio/ogg'], maxBytes: 2n * GiB, magic: 'ogg' },
  '.mp4': { mimeTypes: ['video/mp4'], maxBytes: 20n * GiB, magic: 'mp4' },
  '.mov': { mimeTypes: ['video/quicktime'], maxBytes: 20n * GiB, magic: 'mp4' },
  '.webm': { mimeTypes: ['video/webm'], maxBytes: 20n * GiB, magic: 'webm' },
};

@Injectable()
export class FilePolicyService {
  constructor(private readonly systemConfig: SystemConfigService) {}

  async validateDeclaration(
    fileName: string,
    contentType: string,
    sizeBytes: bigint,
  ): Promise<string> {
    const normalizedName = this.normalizeFileName(fileName);
    const extension = extname(normalizedName).toLowerCase();
    const rule = RULES[extension];
    if (!rule) throw new BadRequestException('不支持该文件格式');
    const config = await this.getConfig();
    if (
      config.allowedExtensions?.length &&
      !config.allowedExtensions
        .map((item) => item.toLowerCase())
        .map((item) => (item.startsWith('.') ? item : `.${item}`))
        .includes(extension)
    ) {
      throw new BadRequestException('该文件格式已被管理员停用');
    }
    if (!rule.mimeTypes.includes(contentType.toLowerCase())) {
      throw new BadRequestException('文件扩展名与 Content-Type 不匹配');
    }
    const configuredMax = this.configuredMax(extension, config);
    if (
      sizeBytes <= 0n ||
      sizeBytes > configuredMax ||
      sizeBytes > rule.maxBytes
    ) {
      throw new BadRequestException('文件大小超过该类型限制');
    }
    return normalizedName;
  }

  private async getConfig(): Promise<{
    allowedExtensions?: string[];
    imageMaxMiB?: number;
    documentMaxMiB?: number;
    audioMaxMiB?: number;
    videoMaxMiB?: number;
  }> {
    return (await this.systemConfig.getConfig('drive')) ?? {};
  }

  private configuredMax(
    extension: string,
    config: Awaited<ReturnType<FilePolicyService['getConfig']>>,
  ) {
    const image = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'].includes(
      extension,
    );
    const audio = ['.mp3', '.m4a', '.wav', '.aac', '.ogg'].includes(extension);
    const video = ['.mp4', '.mov', '.webm'].includes(extension);
    const value = image
      ? (config.imageMaxMiB ?? 20)
      : audio
        ? (config.audioMaxMiB ?? 2048)
        : video
          ? (config.videoMaxMiB ?? 20480)
          : (config.documentMaxMiB ?? 100);
    return BigInt(value) * MiB;
  }

  validateMagic(fileName: string, bytes: Buffer): void {
    const rule = RULES[extname(fileName).toLowerCase()];
    if (!rule || !this.matchesMagic(rule.magic, bytes)) {
      throw new BadRequestException('文件内容与声明格式不匹配');
    }
  }

  isExecutableContentType(contentType: string): boolean {
    return contentType === 'image/svg+xml' || contentType === 'text/html';
  }

  requiresMalwareScan(fileName: string): boolean {
    const extension = extname(fileName).toLowerCase();
    return ![
      '.mp3',
      '.m4a',
      '.wav',
      '.aac',
      '.ogg',
      '.mp4',
      '.mov',
      '.webm',
    ].includes(extension);
  }

  private normalizeFileName(value: string): string {
    const name = value.trim();
    if (!name || name === '.' || name === '..' || /[\\/\0\r\n]/.test(name)) {
      throw new BadRequestException('文件名不合法');
    }
    return name;
  }

  private matchesMagic(type: FileRule['magic'], bytes: Buffer): boolean {
    const ascii = bytes.subarray(0, 16).toString('ascii');
    if (type === 'jpeg')
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (type === 'png')
      return bytes
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if (type === 'webp')
      return ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP';
    if (type === 'gif')
      return ascii.startsWith('GIF87a') || ascii.startsWith('GIF89a');
    if (type === 'pdf') return ascii.startsWith('%PDF-');
    if (type === 'docx' || type === 'xlsx' || type === 'pptx') {
      const zip =
        bytes[0] === 0x50 &&
        bytes[1] === 0x4b &&
        [0x03, 0x05, 0x07].includes(bytes[2]);
      const names = bytes.toString('utf8');
      const required =
        type === 'docx' ? 'word/' : type === 'xlsx' ? 'xl/' : 'ppt/';
      return (
        zip && names.includes('[Content_Types].xml') && names.includes(required)
      );
    }
    if (type === 'text') return !bytes.includes(0);
    if (type === 'mp3')
      return (
        ascii.startsWith('ID3') ||
        (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)
      );
    if (type === 'mp4')
      return (
        bytes.length >= 12 && bytes.subarray(4, 8).toString('ascii') === 'ftyp'
      );
    if (type === 'wav')
      return ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WAVE';
    if (type === 'aac') return bytes[0] === 0xff && (bytes[1] & 0xf6) === 0xf0;
    if (type === 'ogg') return ascii.startsWith('OggS');
    if (type === 'webm')
      return bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
    return false;
  }
}
