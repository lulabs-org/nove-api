import { Injectable, Logger } from '@nestjs/common';
import { SummaryService } from '@/integrations/tencent-meeting/services/meeting-summary.service';
import { MeetingSummaryRepository } from '@/meeting/repositories/meeting-summary.repository';
import { GenerationMethod, ProcessingStatus } from '@prisma/client';

@Injectable()
export class TencentMtgSummarySyncService {
  private readonly logger = new Logger(TencentMtgSummarySyncService.name);

  constructor(
    private readonly summaryService: SummaryService,
    private readonly meetingSummaryRepo: MeetingSummaryRepository,
  ) {}

  /**
   * 拉取并保存腾讯会议的 AI 智能总结、纪要、待办事项等
   */
  async upsertSummaryFromFile(
    meetingId: string,
    recordingId: string,
    fileId: string,
    operatorId: string,
  ) {
    this.logger.log(
      `Syncing summary for meeting ${meetingId}, recording ${recordingId}, file ${fileId}`,
    );

    const content = await this.summaryService.getContent(fileId, operatorId);

    // 如果没有任何内容，直接跳过保存
    if (!content.fullSummary && !content.aiMinutes && !content.todo) {
      this.logger.log(`No summary content found for file ${fileId}, skipping.`);
      return;
    }

    await this.meetingSummaryRepo.upsert({
      meetingId: meetingId,
      recordingId: recordingId,
      content: content.fullSummary || '',
      aiMinutes: content.aiMinutes ? { content: content.aiMinutes } : undefined,
      actionItems: content.todo ? { items: content.todo } : undefined,
      generatedBy: GenerationMethod.AI,
      aiModel: 'tencent-meeting-ai',
      status: ProcessingStatus.COMPLETED,
      language: 'zh-CN',
      version: 1,
      isLatest: true,
    });

    this.logger.log(`Successfully synced summary for file ${fileId}`);
  }
}
