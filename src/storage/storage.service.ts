/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-06 16:03:39
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-06 16:20:34
 * @FilePath: /nove_api/src/storage/storage.service.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { Injectable, Inject } from '@nestjs/common';
import * as OSS from 'ali-oss';
import { storageConfig, StorageConfig } from '@/configs/storage.config';

@Injectable()
export class StorageService {
  private client: OSS;

  constructor(@Inject(storageConfig.KEY) private config: StorageConfig) {
    this.client = new OSS({
      region: this.config.oss.region,
      accessKeyId: this.config.oss.accessKeyId,
      accessKeySecret: this.config.oss.accessKeySecret,
      bucket: this.config.oss.bucket,
    });
  }

  async uploadSkillFile(
    buffer: Buffer,
    fileName: string,
    userId: string,
  ): Promise<{ url: string; key: string }> {
    const key = `skills/${userId}/${Date.now()}-${fileName}`;
    await this.client.put(key, buffer);
    const url = `https://${this.config.oss.bucket}.${this.config.oss.region}.aliyuncs.com/${key}`;
    return { url, key };
  }

  async getFileContent(key: string): Promise<string> {
    const result = await this.client.get(key);
    if (result.content instanceof Buffer) {
      return result.content.toString('utf-8');
    }
    throw new Error('Invalid content type from OSS');
  }

  async deleteFile(key: string): Promise<void> {
    await this.client.delete(key);
  }
}
