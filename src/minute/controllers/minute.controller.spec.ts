/* eslint-disable @typescript-eslint/unbound-method */
import { PATH_METADATA } from '@nestjs/common/constants';
import { MinuteService } from '../services/minute.service';
import { TranscriptService } from '../services/transcript.service';
import { MinuteController } from './minute.controller';
import { MinuteFileDriveService } from '../services/minute-file-drive.service';
import type { AuthContext } from '@/auth/types/auth-context.interface';

const auth = {
  authMethod: 'jwt',
  userId: 'user-1',
  orgId: 'org-1',
  permissions: ['minute:read'],
} satisfies AuthContext;

describe('MinuteController transcript routes', () => {
  let transcriptService: { getJson: jest.Mock; getText: jest.Mock };
  let controller: MinuteController;
  const minuteService = {
    getById: jest.fn().mockResolvedValue({ id: 'minute-1' }),
    requireOrgId: jest.fn((orgId: string) => orgId),
  };

  beforeEach(() => {
    transcriptService = {
      getJson: jest.fn(),
      getText: jest.fn(),
    };
    controller = new MinuteController(
      minuteService as unknown as MinuteService,
      transcriptService as unknown as TranscriptService,
      {} as MinuteFileDriveService,
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
      controller.getTranscript('minute-1', { includeLocalUser: true }, auth),
    ).resolves.toBe(response);
    expect(transcriptService.getJson).toHaveBeenCalledWith('minute-1', true);
    expect(transcriptService.getText).not.toHaveBeenCalled();
  });

  it('returns only rendered text from the text route', async () => {
    transcriptService.getText.mockResolvedValue('转写文本');

    await expect(
      controller.getTranscriptText('minute-1', auth),
    ).resolves.toEqual({
      text: '转写文本',
    });
    expect(transcriptService.getText).toHaveBeenCalledWith('minute-1');
    expect(transcriptService.getJson).not.toHaveBeenCalled();
  });
});
