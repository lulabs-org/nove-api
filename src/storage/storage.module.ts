import { Module } from '@nestjs/common';
import { IntegrationsModule } from '@/admin/integrations';
import { AliyunOssStorageService } from './aliyun-oss-storage.service';
import { StorageTesterService } from './storage.tester';
import { OBJECT_STORAGE } from './object-storage.interface';

@Module({
  imports: [IntegrationsModule],
  providers: [
    AliyunOssStorageService,
    StorageTesterService,
    {
      provide: OBJECT_STORAGE,
      useExisting: AliyunOssStorageService,
    },
  ],
  exports: [OBJECT_STORAGE, StorageTesterService],
})
export class StorageModule {}

