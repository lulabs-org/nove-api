/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-28
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-28 17:29:52
 * @FilePath: /nove_api/src/tencent-mtg-hook/services/recording-data-fetcher.service.ts
 * @Description: 录制数据获取服务，负责获取参会者列表和录制内容
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  SummaryService,
  TranscriptService,
  ParticipantService,
} from '@/integrations/tencent-meeting/services';
import { SpeakerService } from './index';
import { RecordingData } from '@/tencent-mtg-hook/types';

@Injectable()
export class RecordingDataFetcherService {
  private readonly logger = new Logger(RecordingDataFetcherService.name);

  constructor(
    private readonly participantSvc: ParticipantService,
    private readonly summarySvc: SummaryService,
    private readonly transcriptSvc: TranscriptService,
    private readonly speakerSvc: SpeakerService,
  ) {}

  async fetch(r: RecordingData): Promise<RecordingData> {
    if (!r.meetid || !r.cid) {
      this.logger.warn('缺少必要参数: meetid 或 cid');
      return r;
    }

    try {
      const { deduplicated, original } = await this.participantSvc.list(
        r.meetid,
        r.cid,
        r.subid,
      );

      r.deduplicated = deduplicated;
      r.participants = original;
      this.logger.log(`获取去重参会者成功: ${deduplicated.length} 人`);
    } catch (error) {
      this.logger.error(`获取去重参会者失败: ${error instanceof Error ? error.message : String(error)}`);
      return r;
    }

    if (!r.files?.length) {
      this.logger.warn('没有录制文件');
      return r;
    }

    for (const file of r.files) {
      const [content, transcript] = await Promise.allSettled([
        this.summarySvc.getContent(file.id, r.cid),
        this.transcriptSvc.fetch(file.id, r.cid),
      ]);

      if (content.status === 'fulfilled') {
        file.fullsummary = content.value.fullSummary;
        file.aiminutes = content.value.aiMinutes;
      } else {
        this.logger.warn(`获取会议内容失败: ${file.id}, ${content.reason}`);
      }

      if (transcript.status === 'fulfilled') {
        // 设置转写文本、说话人列表和段落信息
        file.formattedtext = transcript.value.formattedText;
        file.speakerlist = transcript.value.uniqueSpeakerInfos;
        file.paragraphs = transcript.value.paragraphs;

        // 如果存在去重参会者数据和说话人列表，则丰富说话人信息
        if (r.deduplicated && file.speakerlist) {
          const deduplicated = r.deduplicated;
          file.speakerlist = await Promise.all(
            file.speakerlist.map((speakerInfo) =>
              this.speakerSvc.enrichSpeakerInfo(speakerInfo, deduplicated),
            ),
          );
        }

        // 如果存在去重参会者数据和段落信息，则丰富段落中的说话人信息
        if (r.deduplicated && file.paragraphs) {
          const deduplicated = r.deduplicated;
          file.paragraphs = await Promise.all(
            file.paragraphs.map(async (paragraph) => ({
              ...paragraph,
              speaker_info: await this.speakerSvc.enrichSpeakerInfo(
                paragraph.speaker_info,
                deduplicated,
              ),
            })),
          );
        }
      } else {
        this.logger.warn(`获取录音转写失败: ${file.id}, ${transcript.reason}`);
      }
    }

    return r;
  }
}
