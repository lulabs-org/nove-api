/* eslint-disable @typescript-eslint/unbound-method */
import { PATH_METADATA } from '@nestjs/common/constants';
import { MinuteService } from '../services/minute.service';
import { TranscriptService } from '../services/transcript.service';
import { MinuteController } from './minute.controller';

describe('MinuteController transcript routes', () => {
  let transcriptService: { getJson: jest.Mock; getText: jest.Mock };
  let controller: MinuteController;

  beforeEach(() => {
    transcriptService = {
      getJson: jest.fn(),
      getText: jest.fn(),
    };
    controller = new MinuteController(
      {} as MinuteService,
      transcriptService as unknown as TranscriptService,
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
      controller.getTranscript('minute-1', { includeLocalUser: true }),
    ).resolves.toBe(response);
    expect(transcriptService.getJson).toHaveBeenCalledWith('minute-1', true);
    expect(transcriptService.getText).not.toHaveBeenCalled();
  });

  it('returns only rendered text from the text route', async () => {
    transcriptService.getText.mockResolvedValue('转写文本');

    await expect(controller.getTranscriptText('minute-1')).resolves.toEqual({
      text: '转写文本',
    });
    expect(transcriptService.getText).toHaveBeenCalledWith('minute-1');
    expect(transcriptService.getJson).not.toHaveBeenCalled();
  });
});
