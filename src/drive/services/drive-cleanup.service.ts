import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { UploadSessionStatus } from '@prisma/client';
import {
  OBJECT_STORAGE,
  ObjectStorage,
} from '@/storage/object-storage.interface';
import { DriveCleanupRepository } from '../repositories';

@Injectable()
export class DriveCleanupService {
  private readonly logger = new Logger(DriveCleanupService.name);

  constructor(
    private readonly cleanup: DriveCleanupRepository,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  @Cron('0 15 2 * * *', { timeZone: 'Asia/Shanghai' })
  async runDailyCleanup(): Promise<void> {
    await this.expireUploads();
    await this.purgeTrash();
  }

  async expireUploads(): Promise<number> {
    const sessions = await this.cleanup.findExpiredUploadSessions(new Date());
    for (const session of sessions) {
      await this.storage
        .abortMultipartUpload({
          key: session.objectKey,
          uploadId: session.providerUploadId,
        })
        .catch(() => undefined);
      if (
        session.status === UploadSessionStatus.REJECTED ||
        session.status === UploadSessionStatus.VERIFYING
      ) {
        if (session.status === UploadSessionStatus.VERIFYING) {
          await this.cleanup.rejectVerifyingVersions(
            session.objectKey,
            new Date(),
          );
        }
        await this.storage
          .deleteObject(session.objectKey)
          .catch(() => undefined);
      }
      await this.cleanup.expireUploadSession(session.id);
    }
    return sessions.length;
  }

  async purgeTrash(): Promise<number> {
    const roots = await this.cleanup.findTrashRoots(new Date());
    let purged = 0;
    for (const root of roots) {
      try {
        if (await this.purgeNode(root.id)) purged += 1;
      } catch (error) {
        this.logger.error(
          `Failed to purge drive node ${root.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    return purged;
  }

  async purgeNode(rootId: string): Promise<boolean> {
    const root = await this.cleanup.findNode(rootId);
    if (!root?.deletedAt) return false;
    const nodes = await this.collectSubtree(rootId);
    const fileIds = nodes
      .map((node) => node.fileId)
      .filter((id): id is string => Boolean(id));
    if (await this.cleanup.countActiveBindings(fileIds)) {
      return false;
    }

    const versions = await this.cleanup.findVersions(fileIds);
    await this.cleanup.purgeGraph({
      spaceId: root.spaceId,
      rootId: root.id,
      nodeIdsInDeleteOrder: [...nodes].reverse().map((node) => node.id),
      fileIds,
    });

    for (const version of versions) {
      if (
        await this.cleanup.countStorageObjectReferences(version.storageObjectId)
      )
        continue;
      await this.storage
        .deleteObject(version.storageObject.objectKey)
        .catch(() => undefined);
      await this.cleanup
        .deleteStorageObject(version.storageObjectId)
        .catch(() => undefined);
    }
    return true;
  }

  private async collectSubtree(rootId: string) {
    return this.cleanup.collectDeletedSubtree(rootId);
  }
}
