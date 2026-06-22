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

    const cid = r.cid;

    try {
      const { unique, raw } = await this.participantSvc.list(
        r.meetid,
        cid,
        r.subid,
      );

      r.deduplicated = unique;
      r.participants = raw;
      this.logger.log(`获取去重参会者成功: ${unique.length} 人`);
    } catch (error) {
      this.logger.error(
        `获取去重参会者失败: ${error instanceof Error ? error.message : String(error)}`,
      );
      return r;
    }

    if (!r.files?.length) {
      this.logger.warn('没有录制文件');
      return r;
    }

    await Promise.all(
      r.files.map(async (file) => {
        if (!file.id) return;

        const [content, transcript] = await Promise.allSettled([
          this.summarySvc.getContent(file.id, cid),
          this.transcriptSvc.fetch(file.id, cid),
        ]);

        if (content.status === 'fulfilled') {
          file.fullsummary = content.value.summary;
          file.aiminutes = content.value.minutes;
        } else {
          this.logger.warn(`获取会议内容失败: ${file.id}, ${content.reason}`);
        }

        if (transcript.status === 'fulfilled') {
          file.formattedtext = transcript.value.text;
          let speakers: any = transcript.value.speakers;
          let paragraphs: any = transcript.value.paragraphs;

          if (r.deduplicated) {
            const dedup = r.deduplicated;
            const enrich = (info: any) =>
              this.speakerSvc.enrichSpeakerInfo(info, dedup);

            [speakers, paragraphs] = await Promise.all([
              speakers ? Promise.all(speakers.map(enrich)) : undefined,
              paragraphs
                ? Promise.all(
                    paragraphs.map(async (p: any) => ({
                      ...p,
                      speaker_info: await enrich(p.speaker_info),
                    })),
                  )
                : undefined,
            ]);
          }

          file.speakerlist = speakers;
          file.paragraphs = paragraphs;
        } else {
          this.logger.warn(`获取录音转写失败: ${file.id}, ${transcript.reason}`);
        }
      }),
    );

    return r;
  }
}
