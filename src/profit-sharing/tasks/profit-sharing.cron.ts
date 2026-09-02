import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ProfitSharingRecordRepository } from '../repositories/profit-sharing-record.repository';

@Injectable()
export class ProfitSharingCron {
  private readonly logger = new Logger(ProfitSharingCron.name);

  constructor(
    private readonly recordRepository: ProfitSharingRecordRepository,
  ) {}

  /**
   * 每天凌晨 1 点执行：将到了结算时间的流水状态更新为 SETTLED
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handleSettlement() {
    this.logger.log('Start automatic settlement cron job...');

    try {
      const result =
        await this.recordRepository.updatePendingRecordsToSettled();

      this.logger.log(
        `Automatic settlement completed. Updated ${result.count} records to SETTLED.`,
      );
    } catch (error) {
      this.logger.error(
        'Failed to execute automatic settlement cron job',
        error,
      );
    }
  }
}
