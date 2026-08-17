import { Injectable, Logger } from '@nestjs/common';
import { MeetingSummaryService } from '@/meeting/services/meeting-summary.service';
import { GenerationMethod, ProcessingStatus } from '@prisma/client';
import { SummaryService as ApiSummaryService } from '@/integrations/tencent-meeting/services/meeting-summary.service';

@Injectable()
export class TencentMtgSummaryCoreService {
  private readonly logger = new Logger(TencentMtgSummaryCoreService.name);

  constructor(
    private readonly meetingSummaryService: MeetingSummaryService,
    private readonly apiSummaryService: ApiSummaryService,
  ) {}

  // ==========================================
  // 从 Webhook 录制数据入库
  // ==========================================
  async upsertSummaryFromWebhook(
    meetingId: string,
    recordingId: string,
    fullSummary: string,
    aiMinutes?: string,
    actionItems?: string,
  ) {
    return await this.meetingSummaryService.upsert({
      meetingId,
      recordingId,
      content: fullSummary || '',
      aiMinutes: aiMinutes ? { content: aiMinutes } : undefined,
      actionItems: actionItems ? { items: actionItems } : undefined,
      generatedBy: GenerationMethod.AI,
      aiModel: 'tencent-meeting-ai',
      status: ProcessingStatus.COMPLETED,
      language: 'zh-CN',
      version: 1,
      isLatest: true,
    });
  }

  // ==========================================
  // 从 API 数据中拉取处理智能总结入库
  // ==========================================
  async upsertSummaryFromApi(
    meetingId: string,
    recordingId: string,
    fileId: string,
    operatorId: string,
  ) {
    this.logger.log(
      `Syncing summary for meeting ${meetingId}, recording ${recordingId}, file ${fileId}`,
    );

    const content = await this.apiSummaryService.getContent(fileId, operatorId);

    // 如果没有任何内容，直接跳过保存
    if (!content.fullSummary && !content.aiMinutes && !content.todo) {
      this.logger.log(`No summary content found for file ${fileId}, skipping.`);
      return;
    }

    await this.meetingSummaryService.upsert({
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
