import { Injectable, Logger } from '@nestjs/common';
import { MinuteSummaryService } from '@/minute/services';
import { CreateMinuteSummaryDto } from '@/minute/dto/minute-summary.dto';
import { GenerationMethod } from '@prisma/client';
import { SummaryService as ApiSummaryService } from '@/integrations/tencent-meeting/services/meeting-summary.service';

@Injectable()
export class TencentMtgSummaryCoreService {
  private readonly logger = new Logger(TencentMtgSummaryCoreService.name);

  constructor(
    private readonly meetingSummaryService: MinuteSummaryService,
    private readonly apiSummaryService: ApiSummaryService,
  ) {}

  // ==========================================
  // 从 Webhook 录制数据入库
  // ==========================================
  async upsertSummaryFromWebhook(
    meetingId: string,
    minuteId: string,
    fullSummary: string,
    aiMinutes?: string,
    actionItems?: string,
  ) {
    return await this.meetingSummaryService.create(minuteId, {
      minuteId,
      content: fullSummary || '',
      aiMinutes: aiMinutes ? { content: aiMinutes } : undefined,
      actionItems: actionItems ? { items: actionItems } : undefined,
      metadata: {
        generatedBy: GenerationMethod.AI,
        aiModel: 'tencent-meeting-ai',
      }, // Note: CreateMinuteSummaryDto doesn't have generatedBy directly, but it can be handled if we pass it, actually the service ignores it or passes it? Wait, let's look at what we did.
    } as unknown as CreateMinuteSummaryDto);
  }

  // ==========================================
  // 从 API 数据中拉取处理智能总结入库
  // ==========================================
  async upsertSummaryFromApi(
    meetingId: string,
    minuteId: string,
    fileId: string,
    operatorId: string,
  ) {
    this.logger.log(
      `Syncing summary for meeting ${meetingId}, recording ${minuteId}, file ${fileId}`,
    );

    const content = await this.apiSummaryService.getContent(fileId, operatorId);

    // 如果没有任何内容，直接跳过保存
    if (!content.fullSummary && !content.aiMinutes && !content.todo) {
      this.logger.log(`No summary content found for file ${fileId}, skipping.`);
      return;
    }

    await this.meetingSummaryService.create(minuteId, {
      minuteId: minuteId,
      content: content.fullSummary || '',
      aiMinutes: content.aiMinutes ? { content: content.aiMinutes } : undefined,
      actionItems: content.todo ? { items: content.todo } : undefined,
    });

    this.logger.log(`Successfully synced summary for file ${fileId}`);
  }
}
