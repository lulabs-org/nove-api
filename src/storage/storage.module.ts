import { forwardRef, Module } from '@nestjs/common';
import { IntegrationsModule } from '@/admin/integrations/integrations.module';
import { MailBrandLogoController } from './controllers';
import {
  AliyunOssStorageService,
  MailBrandLogoService,
  StorageTesterService,
} from './services';
import { OBJECT_STORAGE } from './interfaces';

@Module({
  imports: [forwardRef(() => IntegrationsModule)],
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
