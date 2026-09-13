import { RecordingFileType } from '@/generated/prisma/client';
import { MinuteFileDriveService } from '../services/minute-file-drive.service';
/* eslint-disable @typescript-eslint/unbound-method */
import { AuthContext } from '@/auth/types/auth-context.interface';
import { PATH_METADATA } from '@nestjs/common/constants';
import { MinuteService } from '../services/minute.service';
import { TranscriptService } from '../services/transcript.service';
import { MinuteController } from './minute.controller';

describe('MinuteController transcript routes', () => {
  let transcriptService: { getJson: jest.Mock; getText: jest.Mock };
  let minuteService: { getById: jest.Mock };
  let controller: MinuteController;
  const files = { list: jest.fn(), attach: jest.fn() };

  beforeEach(() => {
    transcriptService = {
      getJson: jest.fn(),
      getText: jest.fn(),
    };
    minuteService = {
      getById: jest.fn().mockResolvedValue({ id: 'minute-1' }),
    };
    controller = new MinuteController(
      minuteService as unknown as MinuteService,
      transcriptService as unknown as TranscriptService,
      files as unknown as MinuteFileDriveService,
    );
  });

  it('exposes structured and text transcripts through separate routes', () => {
    expect(Reflect.getMetadata(PATH_METADATA, controller.getTranscript)).toBe(
      ':id/transcript',
    );
    expect(
      Reflect.getMetadata(PATH_METADATA, controller.getTranscriptText),
    ).toBe(':id/transcript/text');
  });

  it('returns the structured transcript with optional local users', async () => {
    const response = { transcriptId: 'transcript-1', data: [] };
    transcriptService.getJson.mockResolvedValue(response);

    await expect(
      controller.getTranscript('minute-1', { includeLocalUser: true }, 'org-1'),
    ).resolves.toBe(response);
    expect(transcriptService.getJson).toHaveBeenCalledWith('minute-1', true);
    expect(minuteService.getById).toHaveBeenCalledWith('minute-1', 'org-1');
    expect(transcriptService.getText).not.toHaveBeenCalled();
  });

  it('returns only rendered text from the text route', async () => {
    transcriptService.getText.mockResolvedValue('转写文本');

    await expect(
      controller.getTranscriptText('minute-1', 'org-1'),
    ).resolves.toEqual({ text: '转写文本' });
    expect(transcriptService.getText).toHaveBeenCalledWith('minute-1');
    expect(minuteService.getById).toHaveBeenCalledWith('minute-1', 'org-1');
    expect(transcriptService.getJson).not.toHaveBeenCalled();
  });

  it('keeps file reads and attachments scoped even for a drive administrator', async () => {
    const auth = {
      orgId: 'org-other',
      permissions: ['drive:admin'],
    } as AuthContext;
    await controller.listMinuteFiles('minute-1', 'org-a');
    expect(files.list).toHaveBeenCalledWith('minute-1', 'org-a');
    const dto = { fileId: 'file-1', fileType: RecordingFileType.TRANSCRIPT };
    await controller.attachMinuteFile('minute-1', dto, auth, 'org-a');
    expect(files.attach).toHaveBeenCalledWith('minute-1', dto, auth, 'org-a');
  });
});
