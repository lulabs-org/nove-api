import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { PrismaModule } from '@/prisma/prisma.module';
import { StorageModule } from '@/storage/storage.module';
import { DriveController } from './drive.controller';
import { DriveService } from './services/drive.service';
import { DrivePolicyService } from './services/drive-policy.service';
import { FilePolicyService } from './services/file-policy.service';
import { DriveCleanupService } from './services/drive-cleanup.service';
import { SystemConfigModule } from '@/admin/system-config/system-config.module';
import { AliyunFileScannerService } from './scanning/aliyun-file-scanner.service';
import { ClamAvFileScannerService } from './scanning/clamav-file-scanner.service';
import { FileScanService } from './scanning/file-scan.service';
import { FileScanProcessor } from './scanning/file-scan.processor';
import { DRIVE_SCAN_QUEUE } from './scanning/file-scanner.types';
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
    SystemConfigModule,
    BullModule.registerQueue({ name: DRIVE_SCAN_QUEUE }),
    BullBoardModule.forFeature({
      name: DRIVE_SCAN_QUEUE,
      adapter: BullMQAdapter,
    }),
  ],
  controllers: [DriveController],
  providers: [
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
    AliyunFileScannerService,
    ClamAvFileScannerService,
    FileScanService,
    FileScanProcessor,
  ],
  exports: [DriveService, DrivePolicyService],
})
export class DriveModule {}
