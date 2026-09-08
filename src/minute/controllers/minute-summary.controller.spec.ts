import { MinuteSummaryController } from './minute-summary.controller';
import { MinuteSummaryService } from '../services/minute-summary.service';
import { MinuteService } from '../services/minute.service';

describe('MinuteSummaryController organization scope', () => {
  it('checks the parent minute before returning its summary', async () => {
    const summaryService = {
      findByMinuteId: jest.fn().mockResolvedValue({ id: 'summary-1' }),
    };
    const minuteService = {
      getById: jest.fn().mockResolvedValue({ id: 'minute-1' }),
    };
    const controller = new MinuteSummaryController(
      summaryService as unknown as MinuteSummaryService,
      minuteService as unknown as MinuteService,
    );

    await expect(controller.getSummary('minute-1', 'org-1')).resolves.toEqual({
      id: 'summary-1',
    });
    expect(minuteService.getById).toHaveBeenCalledWith('minute-1', 'org-1');
    expect(summaryService.findByMinuteId).toHaveBeenCalledWith('minute-1');
  });
});
