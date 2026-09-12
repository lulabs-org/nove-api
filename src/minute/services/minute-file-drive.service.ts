import { Injectable, NotFoundException } from '@nestjs/common';
import { FileBindingTargetType } from '@/generated/prisma/client';
import { DriveService } from '@/drive/services/drive.service';
import { DriveAuthContext } from '@/drive/policies';
import { AttachMinuteFileDto } from '../dto/minute-file.dto';
import { MinuteRepository } from '../repositories/minute.repository';
import { MinuteFileRepository } from '../repositories/minute-file.repository';

@Injectable()
export class MinuteFileDriveService {
  constructor(
    private readonly minuteRepository: MinuteRepository,
    private readonly minuteFileRepository: MinuteFileRepository,
    private readonly driveService: DriveService,
  ) {}

  async list(minuteId: string, orgId: string) {
    await this.requireMinute(minuteId, orgId);
    const files = await this.minuteFileRepository.findAttachedFiles(minuteId);
    return files.map((item) => {
      const file = item.fileBinding!.file;
      const version = file.versions[0];
      return {
        id: item.id,
        minuteId: item.minuteId,
        fileType: item.fileType,
        durationMs: item.durationMs?.toString() ?? null,
        resolution: item.resolution,
        fileId: file.id,
        nodeId: file.node?.id ?? null,
        name: file.node?.name ?? version?.originalName ?? '未命名文件',
        contentType: version?.contentType ?? null,
        sizeBytes: version?.sizeBytes.toString() ?? null,
        status: version?.status ?? null,
        createdAt: item.createdAt,
      };
    });
  }

  async attach(
    minuteId: string,
    dto: AttachMinuteFileDto,
    auth: DriveAuthContext,
    orgId: string,
  ) {
    const minute = await this.requireMinute(minuteId, orgId);
    const file = await this.driveService.getFile(dto.fileId, auth);

    const occurredAt = minute.meeting!.startAt ?? minute.createdAt;
    const year = String(occurredAt.getUTCFullYear());
    const month = String(occurredAt.getUTCMonth() + 1).padStart(2, '0');
    const pathSegments = ['会议资料', year, month, minute.meetingId!];

    const targetFolderId = await this.driveService.ensureFolderPath(
      file.node.spaceId,
      pathSegments,
    );

    const bindingResult = await this.driveService.bindFileToTarget({
      fileId: file.id,
      targetType: FileBindingTargetType.MINUTE,
      targetId: minuteId,
      targetFolderId,
      purpose: dto.fileType,
      auth,
      orgId,
    });

    if (bindingResult.alreadyBound) {
      const existingMinuteFile =
        await this.minuteFileRepository.findByBindingId(
          bindingResult.bindingId,
        );
      if (existingMinuteFile) {
        return existingMinuteFile;
      }
    }

    return this.minuteFileRepository.create({
      minuteId,
      fileObjectId: bindingResult.storageObjectId,
      fileBindingId: bindingResult.bindingId,
      fileType: dto.fileType,
      durationMs: dto.durationMs,
      resolution: dto.resolution,
    });
  }

  private async requireMinute(minuteId: string, orgId: string) {
    const minute = await this.minuteRepository.findById(minuteId, orgId);
    if (!minute || !minute.meetingId || !minute.meeting) {
      throw new NotFoundException('Minute 不存在或未关联会议');
    }
    return minute;
  }
}
