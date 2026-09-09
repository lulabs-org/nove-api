import { NotFoundException } from '@nestjs/common';
import {
  FileBindingTargetType,
  FileVersionStatus,
  RecordingFileType,
} from '@prisma/client';
import { MinuteFileDriveService } from './minute-file-drive.service';
import { MinuteRepository } from '../repositories/minute.repository';
import { MinuteFileRepository } from '../repositories/minute-file.repository';
import { DriveService } from '@/drive/services/drive.service';
import { DriveAuthContext } from '@/drive/policies';
import { AttachMinuteFileDto } from '../dto/minute-file.dto';

describe('MinuteFileDriveService', () => {
  let service: MinuteFileDriveService;
  let minuteRepository: { findById: jest.Mock };
  let minuteFileRepository: {
    findAttachedFiles: jest.Mock;
    findByBindingId: jest.Mock;
    create: jest.Mock;
  };
  let driveService: {
    getFile: jest.Mock;
    ensureFolderPath: jest.Mock;
    bindFileToTarget: jest.Mock;
  };

  const mockAuth: DriveAuthContext = {
    userId: 'user-1',
    orgId: 'org-1',
    authMethod: 'jwt',
    permissions: ['minute:update', 'drive:read', 'drive:update'],
  };

  beforeEach(() => {
    minuteRepository = {
      findById: jest.fn(),
    };
    minuteFileRepository = {
      findAttachedFiles: jest.fn(),
      findByBindingId: jest.fn(),
      create: jest.fn(),
    };
    driveService = {
      getFile: jest.fn(),
      ensureFolderPath: jest.fn(),
      bindFileToTarget: jest.fn(),
    };

    service = new MinuteFileDriveService(
      minuteRepository as unknown as MinuteRepository,
      minuteFileRepository as unknown as MinuteFileRepository,
      driveService as unknown as DriveService,
    );
  });

  describe('list', () => {
    it('throws NotFoundException if minute does not exist', async () => {
      minuteRepository.findById.mockResolvedValue(null);

      await expect(service.list('minute-1', 'org-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(minuteRepository.findById).toHaveBeenCalledWith(
        'minute-1',
        'org-1',
      );
      expect(minuteFileRepository.findAttachedFiles).not.toHaveBeenCalled();
    });

    it('throws NotFoundException if minute has no meetingId', async () => {
      minuteRepository.findById.mockResolvedValue({
        id: 'minute-1',
        meetingId: null,
        meeting: null,
      });

      await expect(service.list('minute-1', 'org-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns formatted attached files on success', async () => {
      minuteRepository.findById.mockResolvedValue({
        id: 'minute-1',
        meetingId: 'meeting-1',
        meeting: { id: 'meeting-1' },
      });

      const createdAt = new Date('2026-01-01T00:00:00Z');
      minuteFileRepository.findAttachedFiles.mockResolvedValue([
        {
          id: 'mf-1',
          minuteId: 'minute-1',
          fileType: RecordingFileType.VIDEO,
          durationMs: 120000n,
          resolution: '1080p',
          createdAt,
          fileBinding: {
            file: {
              id: 'file-1',
              node: { id: 'node-1', name: 'record.mp4' },
              versions: [
                {
                  originalName: 'record.mp4',
                  contentType: 'video/mp4',
                  sizeBytes: 1048576n,
                  status: FileVersionStatus.ACTIVE,
                },
              ],
            },
          },
        },
      ]);

      const result = await service.list('minute-1', 'org-1');

      expect(result).toEqual([
        {
          id: 'mf-1',
          minuteId: 'minute-1',
          fileType: RecordingFileType.VIDEO,
          durationMs: '120000',
          resolution: '1080p',
          fileId: 'file-1',
          nodeId: 'node-1',
          name: 'record.mp4',
          contentType: 'video/mp4',
          sizeBytes: '1048576',
          status: FileVersionStatus.ACTIVE,
          createdAt,
        },
      ]);
    });
  });

  describe('attach', () => {
    const dto: AttachMinuteFileDto = {
      fileId: 'file-1',
      fileType: RecordingFileType.VIDEO,
      durationMs: 60000,
      resolution: '720p',
    };

    it('attaches a new file to minute', async () => {
      const meetingStartAt = new Date('2026-09-08T10:00:00Z');
      minuteRepository.findById.mockResolvedValue({
        id: 'minute-1',
        meetingId: 'meeting-1',
        meeting: { id: 'meeting-1', startAt: meetingStartAt },
        createdAt: new Date('2026-09-08T09:00:00Z'),
      });

      driveService.getFile.mockResolvedValue({
        id: 'file-1',
        node: { spaceId: 'space-1' },
      });

      driveService.ensureFolderPath.mockResolvedValue('folder-meeting-1');

      driveService.bindFileToTarget.mockResolvedValue({
        bindingId: 'binding-1',
        storageObjectId: 'obj-1',
        alreadyBound: false,
      });

      const createdMinuteFile = {
        id: 'mf-new',
        minuteId: 'minute-1',
        fileObjectId: 'obj-1',
        fileBindingId: 'binding-1',
        fileType: RecordingFileType.VIDEO,
      };
      minuteFileRepository.create.mockResolvedValue(createdMinuteFile);

      const result = await service.attach('minute-1', dto, mockAuth, 'org-1');

      expect(minuteRepository.findById).toHaveBeenCalledWith(
        'minute-1',
        'org-1',
      );
      expect(driveService.getFile).toHaveBeenCalledWith('file-1', mockAuth);
      expect(driveService.ensureFolderPath).toHaveBeenCalledWith('space-1', [
        '会议资料',
        '2026',
        '09',
        'meeting-1',
      ]);
      expect(driveService.bindFileToTarget).toHaveBeenCalledWith({
        fileId: 'file-1',
        targetType: FileBindingTargetType.MINUTE,
        targetId: 'minute-1',
        targetFolderId: 'folder-meeting-1',
        purpose: RecordingFileType.VIDEO,
        auth: mockAuth,
        orgId: 'org-1',
      });
      expect(minuteFileRepository.create).toHaveBeenCalledWith({
        minuteId: 'minute-1',
        fileObjectId: 'obj-1',
        fileBindingId: 'binding-1',
        fileType: RecordingFileType.VIDEO,
        durationMs: 60000,
        resolution: '720p',
      });
      expect(result).toBe(createdMinuteFile);
    });

    it('returns existing minuteFile if already bound', async () => {
      minuteRepository.findById.mockResolvedValue({
        id: 'minute-1',
        meetingId: 'meeting-1',
        meeting: { id: 'meeting-1', startAt: new Date('2026-09-08T10:00:00Z') },
        createdAt: new Date('2026-09-08T09:00:00Z'),
      });

      driveService.getFile.mockResolvedValue({
        id: 'file-1',
        node: { spaceId: 'space-1' },
      });

      driveService.ensureFolderPath.mockResolvedValue('folder-meeting-1');

      driveService.bindFileToTarget.mockResolvedValue({
        bindingId: 'binding-existing',
        storageObjectId: 'obj-1',
        alreadyBound: true,
      });

      const existingRecord = {
        id: 'mf-existing',
        fileBindingId: 'binding-existing',
      };
      minuteFileRepository.findByBindingId.mockResolvedValue(existingRecord);

      const result = await service.attach('minute-1', dto, mockAuth, 'org-1');

      expect(minuteFileRepository.findByBindingId).toHaveBeenCalledWith(
        'binding-existing',
      );
      expect(minuteFileRepository.create).not.toHaveBeenCalled();
      expect(result).toBe(existingRecord);
    });
  });
});
