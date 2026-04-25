import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MailProcessor } from './mail.processor';

describe('MailProcessor', () => {
  describe('onCompleted', () => {
    it('logs completed jobs through Nest Logger instead of console.log', () => {
      const processor = new MailProcessor();
      const loggerLogSpy = jest
        .spyOn(Logger.prototype, 'log')
        .mockImplementation(() => undefined);
      const consoleLogSpy = jest
        .spyOn(console, 'log')
        .mockImplementation(() => undefined);

      processor.onCompleted({ id: 'job-123' } as Job);

      expect(loggerLogSpy).toHaveBeenCalledWith('🎉 任务完成: job-123');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });
});
