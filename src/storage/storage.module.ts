import { Module } from '@nestjs/common';
import { IntegrationsModule } from '@/admin/integrations';
import { AliyunOssStorageService } from './aliyun-oss-storage.service';
import { StorageTesterService } from './storage.tester';
import { OBJECT_STORAGE } from './object-storage.interface';
import { MailBrandLogoController } from './mail-brand-logo.controller';
import { MailBrandLogoService } from './mail-brand-logo.service';

@Module({
  imports: [IntegrationsModule],
  controllers: [MailBrandLogoController],
  providers: [
    AliyunOssStorageService,
    StorageTesterService,
    MailBrandLogoService,
    {
      provide: OBJECT_STORAGE,
      useExisting: AliyunOssStorageService,
    },
  ],
  exports: [OBJECT_STORAGE, StorageTesterService],
})
export class StorageModule {}
