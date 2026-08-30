import { Module } from '@nestjs/common';
import { AliyunOssStorageService } from './aliyun-oss-storage.service';
import { OBJECT_STORAGE } from './object-storage.interface';

@Module({
  providers: [
    AliyunOssStorageService,
    {
      provide: OBJECT_STORAGE,
      useExisting: AliyunOssStorageService,
    },
  ],
  exports: [OBJECT_STORAGE],
})
export class StorageModule {}
