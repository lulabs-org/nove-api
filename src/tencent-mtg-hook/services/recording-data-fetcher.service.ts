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
import { NewSpeakerInfo, RecordingDataFile } from '@/tencent-mtg-hook/types';
import {
  SpeakerInfo,
  ParticipantDetail,
} from '@/integrations/tencent-meeting/types';

/**
 * 录制数据拉取服务参数
 */
export interface FetchRecordingParams {
  /** 会议唯一标识符 */
  meetid: string;
  /** 会议创建者的用户ID */
  cid: string;
  /** 子会议ID（周期性会议会有此字段） */
  subid?: string;
  /** 需要处理的录制文件基本信息列表 */
  recordingFiles: Array<{ id: string }>;
}

/**
 * 录制数据拉取服务返回结果
 */
export interface FetchRecordingResult {
  /** 经过去重的参会者列表（用于准确匹配说话人） */
  deduplicated?: ParticipantDetail[];
  /** 包含重复进出记录的原始参会者列表 */
  participants?: ParticipantDetail[];
  /** 经过处理并填充了总结、转写和说话人信息的录制文件列表 */
  recordingFiles: RecordingDataFile[];
}

/**
 * 录制数据获取服务
 * 负责并发拉取会议的参会者列表、会议总结、转写文本，并高效地补充说话人信息。
 */
@Injectable()
export class RecordingDataFetcherService {
  private readonly logger = new Logger(RecordingDataFetcherService.name);

  constructor(
    private readonly participantSvc: ParticipantService,
    private readonly summarySvc: SummaryService,
    private readonly transcriptSvc: TranscriptService,
    private readonly speakerSvc: SpeakerService,
  ) {}

  /**
   * 核心业务方法：根据基础会议信息拉取各项周边数据（参会者、总结、转写）
   * @param params 包含会议基础标识及待处理文件的参数对象
   * @returns 补充完整后的会议衍生数据集合
   */
  async fetch(params: FetchRecordingParams): Promise<FetchRecordingResult> {
    const { meetid, cid, subid, recordingFiles } = params;

    if (!meetid || !cid) {
      this.logger.warn('缺少必要参数: meetid 或 cid');
      return { recordingFiles: [] };
    }

    let deduplicated: ParticipantDetail[] | undefined;
    let participants: ParticipantDetail[] | undefined;

    try {
      const res = await this.participantSvc.list(meetid, cid, subid);
      deduplicated = res.deduplicated;
      participants = res.original;
      this.logger.log(`获取去重参会者成功: ${deduplicated.length} 人`);
    } catch (error) {
      this.logger.error(
        `获取去重参会者失败: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    const processedFiles: RecordingDataFile[] = (recordingFiles || []).map(
      (f) => ({
        id: f.id,
      }),
    );

    if (!processedFiles.length) {
      this.logger.warn('没有录制文件');
      return { deduplicated, participants, recordingFiles: processedFiles };
    }

    // 并发处理所有文件
    await Promise.all(
      processedFiles.map((file) => this.processFile(file, cid, deduplicated)),
    );

    return { deduplicated, participants, recordingFiles: processedFiles };
  }

  /**
   * 并发处理单个录制文件
   * 负责拉取该文件的纪要（Summary）和转写（Transcript），并触发说话人信息补充
   * @param file 待处理的录制文件对象（会被直接填充内容）
   * @param cid 会议创建者ID
   * @param deduplicated 去重后的参会者列表，用于精准匹配说话人
   */
  private async processFile(
    file: RecordingDataFile,
    cid: string,
    deduplicated?: ParticipantDetail[],
  ): Promise<void> {
    const [content, transcript] = await Promise.allSettled([
      this.summarySvc.getContent(file.id, cid),
      this.transcriptSvc.fetch(file.id, cid),
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

      if (deduplicated && file.speakerlist?.length) {
        await this.enrichFileSpeakers(file, deduplicated);
      }
    } else {
      this.logger.warn(`获取录音转写失败: ${file.id}, ${transcript.reason}`);
    }
  }

  /**
   * 丰富（Enrich）并匹配文件中的说话人信息
   * 通过 Map 缓存已补充的说话人信息，避免在段落循环中产生严重的 N+1 数据库查询性能问题。
   * @param file 录制文件对象
   * @param deduplicated 去重后的参会者列表
   */
  private async enrichFileSpeakers(
    file: RecordingDataFile,
    deduplicated: ParticipantDetail[],
  ): Promise<void> {
    // 建立唯一标识符到已丰富说话人信息的映射缓存
    const speakerMap = new Map<string, NewSpeakerInfo>();

    // 1. 丰富唯一的说话人列表
    if (file.speakerlist) {
      file.speakerlist = await Promise.all(
        file.speakerlist.map(async (speakerInfo) => {
          const enriched = await this.speakerSvc.enrichSpeakerInfo(
            speakerInfo,
            deduplicated,
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
