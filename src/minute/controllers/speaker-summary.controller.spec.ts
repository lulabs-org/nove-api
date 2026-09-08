import { SpeakerSummaryController } from './speaker-summary.controller';
import { SpeakerSummaryCrudService } from '../services/speaker-summary-crud.service';
import { SpeakerSummaryService } from '../services/speaker-summary.service';
import { MinuteService } from '../services/minute.service';

describe('SpeakerSummaryController organization scope', () => {
  it('checks the parent minute before listing speaker summaries', async () => {
    const crudService = {
      findMany: jest.fn().mockResolvedValue({ data: [], total: 0 }),
    };
    const minuteService = {
      requireOrgId: jest.fn().mockReturnValue('org-1'),
      getById: jest.fn().mockResolvedValue({ id: 'minute-1' }),
    };
    const controller = new SpeakerSummaryController(
      crudService as unknown as SpeakerSummaryCrudService,
      {} as SpeakerSummaryService,
      minuteService as unknown as MinuteService,
    );

    await expect(
      controller.list('minute-1', { page: 1, limit: 10 }, 'org-1'),
    ).resolves.toEqual({ data: [], total: 0 });
    expect(minuteService.requireOrgId).toHaveBeenCalledWith('org-1');
    expect(minuteService.getById).toHaveBeenCalledWith('minute-1', 'org-1');
    expect(crudService.findMany).toHaveBeenCalledWith('minute-1', 1, 10);
  });
});
