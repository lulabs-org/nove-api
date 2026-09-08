import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { PrismaModule } from '@/prisma/prisma.module';
import { StorageModule } from '@/storage/storage.module';
import { FileScanningModule } from '@/file-scanning';
import { DriveController } from './drive.controller';
import { DriveService } from './services/drive.service';
import { DrivePolicyService } from './services/drive-policy.service';
import { FilePolicyService } from './services/file-policy.service';
import { DriveCleanupService } from './services/drive-cleanup.service';
import { IntegrationsModule } from '@/admin/integrations';
import { DriveConfigService } from './services/drive-config.service';
import { FileScanService } from './scanning/file-scan.service';
import { FileScanProcessor } from './scanning/file-scan.processor';
import { DRIVE_SCAN_QUEUE } from './scanning/file-scan.constants';
import {
  DriveAccessRepository,
  DriveCleanupRepository,
  DriveFileRepository,
  DriveNodeRepository,
  DriveSpaceRepository,
  FileScanRepository,
  UploadSessionRepository,
} from './repositories';

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    IntegrationsModule,
    FileScanningModule,
    BullModule.registerQueue({ name: DRIVE_SCAN_QUEUE }),
    BullBoardModule.forFeature({
      name: DRIVE_SCAN_QUEUE,
      adapter: BullMQAdapter,
    }),
  ],
  controllers: [DriveController],
  providers: [
    DriveConfigService,
    DriveAccessRepository,
    DriveCleanupRepository,
    DriveFileRepository,
    DriveNodeRepository,
    DriveSpaceRepository,
    FileScanRepository,
    UploadSessionRepository,
    DriveService,
    DrivePolicyService,
    FilePolicyService,
    DriveCleanupService,
    FileScanService,
    FileScanProcessor,
  ],
  exports: [DriveService, DrivePolicyService],
})
export class DriveModule {}
