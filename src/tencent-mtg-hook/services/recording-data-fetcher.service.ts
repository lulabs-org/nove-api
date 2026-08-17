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
} from '@/integrations/tencent-meeting/services';
import { SpeakerService } from './index';
import { NewSpeakerInfo, RecordingDataFile } from '@/tencent-mtg-hook/types';
import {
  SpeakerInfo,
  ParticipantDetail,
} from '@/integrations/tencent-meeting/types';

/**
 * 录制数据获取服务
 * 负责并发拉取会议的参会者列表、会议总结、转写文本，并高效地补充说话人信息。
 */
@Injectable()
export class RecordingDataFetcherService {
  private readonly logger = new Logger(RecordingDataFetcherService.name);

  constructor(
    private readonly summarySvc: SummaryService,
    private readonly transcriptSvc: TranscriptService,
    private readonly speakerSvc: SpeakerService,
  ) {}

  /**
   * 批量并发处理录制文件，丰富纪要与转写数据
   * @param files 录制文件对象列表
   * @param cid 会议创建者ID
   * @param meetingId 会议ID
   * @param uniqueParticipants 去重参会者列表
   */
  async processFiles(
    files: RecordingDataFile[],
    cid: string,
    meetingId: string,
    uniqueParticipants?: ParticipantDetail[],
  ): Promise<void> {
    if (!files || !files.length) {
      this.logger.warn('没有录制文件');
      return;
    }

    await Promise.all(
      files.map(async (file) => {
        const [content, transcript] = await Promise.allSettled([
          this.summarySvc.getContent(file.id, cid),
          this.transcriptSvc.fetch(meetingId, file.id, cid),
        ]);

        if (content.status === 'fulfilled') {
          file.fullsummary = content.value.fullSummary;
          file.aiminutes = content.value.aiMinutes;
        } else {
          this.logger.warn(`获取会议内容失败: ${file.id}, ${content.reason}`);
        }

        if (transcript.status === 'fulfilled') {
          file.formattedtext = transcript.value.formattedText;
          file.speakerlist = transcript.value.uniqueSpeakerInfos;
          file.paragraphs = transcript.value.paragraphs;

          if (uniqueParticipants && file.speakerlist?.length) {
            await this.enrichFileSpeakers(file, uniqueParticipants);
          }
        } else {
          this.logger.warn(`获取录音转写失败: ${file.id}, ${transcript.reason}`);
        }
      }),
    );
  }

  /**
   * 丰富（Enrich）并匹配文件中的说话人信息
   * 通过 Map 缓存已补充的说话人信息，避免在段落循环中产生严重的 N+1 数据库查询性能问题。
   * @param file 录制文件对象
   * @param uniqueParticipants 去重后的参会者列表
   */
  private async enrichFileSpeakers(
    file: RecordingDataFile,
    uniqueParticipants: ParticipantDetail[],
  ): Promise<void> {
    // 建立唯一标识符到已丰富说话人信息的映射缓存
    const speakerMap = new Map<string, NewSpeakerInfo>();

    // 1. 丰富唯一的说话人列表
    if (file.speakerlist) {
      file.speakerlist = await Promise.all(
        file.speakerlist.map(async (speakerInfo) => {
          const enriched = await this.speakerSvc.enrichSpeakerInfo(
            speakerInfo,
            uniqueParticipants,
          );
          speakerMap.set(this.getSpeakerKey(speakerInfo), enriched);
          return enriched;
        }),
      );
    }

    // 2. 使用映射缓存直接为所有段落分配已丰富的说话人信息
    if (file.paragraphs) {
      file.paragraphs = file.paragraphs.map((paragraph) => ({
        ...paragraph,
        speaker_info:
          speakerMap.get(this.getSpeakerKey(paragraph.speaker_info)) ||
          paragraph.speaker_info,
      }));
    }
  }

  /**
   * 获取用于唯一标识说话人的键值
   * 依次尝试使用 userid, ms_open_id, openId 或 username
   * @param s 说话人信息对象
   * @returns 作为 Map 缓存键的字符串
   */
  private getSpeakerKey(s: SpeakerInfo | NewSpeakerInfo): string {
    return s.userid || s.ms_open_id || s.openId || s.username || '';
  }
}
