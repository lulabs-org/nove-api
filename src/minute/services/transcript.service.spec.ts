import { NotFoundException } from '@nestjs/common';
import { TranscriptRepository } from '../repositories/transcript.repository';
import { TranscriptService } from './transcript.service';

describe('TranscriptService', () => {
  let repository: {
    findDetails: jest.Mock;
    findDetailsWithLocalUser: jest.Mock;
  };
  let service: TranscriptService;

  beforeEach(() => {
    repository = {
      findDetails: jest.fn(),
      findDetailsWithLocalUser: jest.fn(),
    };
    service = new TranscriptService(
      repository as unknown as TranscriptRepository,
    );
  });

  describe('getJson', () => {
    it('returns the transcript id and mapped platform and local users', async () => {
      repository.findDetailsWithLocalUser.mockResolvedValue({
        id: 'transcript-1',
        segments: [
          {
            id: 'segment-1',
            speakerName: '平台姓名快照',
            startTimeMs: 104_000n,
            endTimeMs: 109_000n,
            text: '老师，我下载 hermes 遇到了点困难。',
            speaker: {
              id: 'platform-user-1',
              displayName: '王奕舒',
              user: {
                id: 'local-user-1',
                profile: {
                  displayName: '王奕舒',
                  fullName: '王奕舒',
                },
              },
            },
          },
        ],
      });

      await expect(service.getJson('minute-1', true)).resolves.toEqual({
        transcriptId: 'transcript-1',
        data: [
          {
            id: 'segment-1',
            speakerName: '平台姓名快照',
            startTime: '00:01:44',
            endTime: '00:01:49',
            text: '老师，我下载 hermes 遇到了点困难。',
            platformUser: {
              id: 'platform-user-1',
              displayName: '王奕舒',
            },
            user: {
              id: 'local-user-1',
              displayName: '王奕舒',
              fullName: '王奕舒',
            },
          },
        ],
      });
      expect(repository.findDetailsWithLocalUser).toHaveBeenCalledWith(
        'minute-1',
      );
      expect(repository.findDetails).not.toHaveBeenCalled();
    });

    it('returns null identities when a segment has no linked speaker', async () => {
      repository.findDetails.mockResolvedValue({
        id: 'transcript-1',
        segments: [
          {
            id: 'segment-1',
            speakerName: '未绑定说话人',
            startTimeMs: 0n,
            endTimeMs: 1_000n,
            text: '发言内容',
            speaker: null,
          },
        ],
      });

      const result = await service.getJson('minute-1');

      expect(result.data[0]).toMatchObject({
        speakerName: '未绑定说话人',
        platformUser: null,
        user: null,
      });
      expect(repository.findDetails).toHaveBeenCalledWith('minute-1');
      expect(repository.findDetailsWithLocalUser).not.toHaveBeenCalled();
    });

    it('throws when the minute has no transcript', async () => {
      repository.findDetailsWithLocalUser.mockResolvedValue(null);

      await expect(service.getJson('minute-1', true)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
