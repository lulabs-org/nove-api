import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { createConnection, Socket } from 'node:net';
import { once } from 'node:events';
import { SystemConfigService } from '@/admin/system-config/system-config.service';
import {
  OBJECT_STORAGE,
  ObjectStorage,
} from '@/storage/object-storage.interface';
import {
  FileScannerProvider,
  FileScanInput,
  FileScanResult,
} from './file-scanner.types';

@Injectable()
export class ClamAvFileScannerService implements FileScannerProvider {
  constructor(
    private readonly systemConfig: SystemConfigService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  async scan(input: FileScanInput): Promise<FileScanResult> {
    const raw = (await this.systemConfig.getConfig('drive')) as
      | { value?: Record<string, unknown> }
      | Record<string, unknown>
      | null;
    const config = (raw?.value ?? raw ?? {}) as {
      clamAvHost?: string;
      clamAvPort?: number;
      clamAvTimeoutMs?: number;
    };
    const host = config.clamAvHost?.trim() || process.env.CLAMAV_HOST?.trim();
    if (!host) throw new ServiceUnavailableException('ClamAV 尚未配置');

    const socket = createConnection({
      host,
      port: config.clamAvPort ?? Number(process.env.CLAMAV_PORT || 3310),
    });
    socket.setTimeout(
      config.clamAvTimeoutMs ?? Number(process.env.CLAMAV_TIMEOUT_MS || 600000),
    );
    await once(socket, 'connect');
    socket.write('zINSTREAM\0');
    const hash = createHash('sha256');

    try {
      const stream = await this.storage.getObjectStream(input.objectKey);
      for await (const rawChunk of stream) {
        const chunk = Buffer.isBuffer(rawChunk)
          ? rawChunk
          : Buffer.from(rawChunk as Uint8Array);
        hash.update(chunk);
        const length = Buffer.allocUnsafe(4);
        length.writeUInt32BE(chunk.length, 0);
        await this.write(socket, length);
        await this.write(socket, chunk);
      }
      await this.write(socket, Buffer.alloc(4));
      const response = await this.readResponse(socket);
      const clean = /:\s+OK\0?$/.test(response);
      const infected = /:\s+.+\s+FOUND\0?$/.test(response);
      if (!clean && !infected) {
        throw new ServiceUnavailableException('ClamAV 返回了未知扫描结果');
      }
      return {
        clean,
        checksumSha256: hash.digest('hex'),
        details: { engine: 'clamav', response: response.replace(/\0/g, '') },
      };
    } finally {
      socket.destroy();
    }
  }

  private async write(socket: Socket, data: Buffer): Promise<void> {
    if (!socket.write(data)) await once(socket, 'drain');
  }

  private readResponse(socket: Socket): Promise<string> {
    return new Promise((resolve, reject) => {
      let response = '';
      socket.on('data', (chunk: Buffer) => {
        response += chunk.toString('utf8');
        if (response.includes('\0')) resolve(response);
      });
      socket.once('timeout', () =>
        reject(new ServiceUnavailableException('ClamAV 扫描超时')),
      );
      socket.once('error', () =>
        reject(new ServiceUnavailableException('ClamAV 服务不可用')),
      );
      socket.once('close', () => response && resolve(response));
    });
  }
}
