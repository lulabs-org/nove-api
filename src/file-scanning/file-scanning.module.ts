import { Module } from '@nestjs/common';
import { StorageModule } from '@/storage/storage.module';
import { IntegrationsModule } from '@/admin/integrations/integrations.module';
import { FileScanningConfigService, FileScanningService } from './services';
import { AliyunFileScannerService, ClamAvFileScannerService } from './providers';

@Module({
  imports: [StorageModule, IntegrationsModule],
  providers: [
    FileScanningConfigService,
    AliyunFileScannerService,
    ClamAvFileScannerService,
    FileScanningService,
  ],
  exports: [FileScanningService, FileScanningConfigService],
})
export class FileScanningModule {}
