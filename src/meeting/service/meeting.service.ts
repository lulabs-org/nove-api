import { Injectable } from '@nestjs/common';
import { ProcessingStatus, Prisma } from '@prisma/client';
import { MeetingRepository } from '../repositories/meeting.repository';
import { TranscriptRepository } from '../repositories/transcript.repository';
import { GetMeetingRecordsParams } from '../types';
import {
  MeetingRecordResponseDto,
  MeetingStatsResponseDto,
  CreateMeetingRecordDto,
  UpdateMeetingRecordDto,
} from '../dto';
import {
  MeetingRecordNotFoundException,
  MeetingRecordAlreadyExistsException,
} from '../exceptions/meeting.exceptions';

/**
 * 核心会议服务
 * 负责协调各平台服务和文件处理器
 */
@Injectable()
export class MeetingService {
  constructor(
    private readonly meetingRepository: MeetingRepository,
    private readonly transcriptRepository: TranscriptRepository,
  ) {}

  /**
   * 获取会议记录列表
   */
  async getMeetingRecords(params: GetMeetingRecordsParams): Promise<{
    records: MeetingRecordResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.meetingRepository.get(params);
  }

  /**
   * 获取会议记录详情
   */
  async getMeetingRecordById(id: string): Promise<MeetingRecordResponseDto> {
    const record = await this.meetingRepository.findById(id);
    if (!record) {
      throw new MeetingRecordNotFoundException(id);
    }
    return record;
  }

  /**
   * 创建会议记录
   */
  async createMeetingRecord(
    params: CreateMeetingRecordDto,
  ): Promise<MeetingRecordResponseDto> {
    // 检查是否已存在
    const existing = await this.meetingRepository.findByPt(
      params.platform,
      params.platformMeetingId,
      '', // Default empty subMeetingId
    );

    if (existing) {
      throw new MeetingRecordAlreadyExistsException(
        params.platformMeetingId,
        '',
      );
    }

    // 转换DTO到repository数据格式
    const createData = {
      platform: params.platform,
      meetingId: params.platformMeetingId,
      title: params.title,
      meetingCode: params.meetingCode || '',
      type: params.type,
      hostId:
        params.hostUserId && params.hostUserId.trim() !== ''
          ? params.hostUserId
          : null,
      startAt: params.actualStartAt ? params.actualStartAt : new Date(),
      endAt: params.endedAt ? params.endedAt : new Date(),
      durationSeconds: params.duration || 0,
      hasRecording: params.hasRecording || false,
      recordingStatus: params.recordingStatus || ProcessingStatus.PENDING,
      processingStatus: params.processingStatus || ProcessingStatus.PENDING,
      metadata: params.metadata as Prisma.InputJsonValue,
    };

    return this.meetingRepository.create(createData);
  }

  /**
   * 更新会议记录
   */
  async updateMeetingRecord(
    id: string,
    params: UpdateMeetingRecordDto,
  ): Promise<MeetingRecordResponseDto> {
    const record = await this.meetingRepository.findById(id);
    if (!record) {
      throw new MeetingRecordNotFoundException(id);
    }

    // 转换DTO到repository数据格式
    const updateData: Record<string, unknown> = {};
    if (params.recordingStatus !== undefined)
      updateData.recordingStatus = params.recordingStatus;
    if (params.processingStatus !== undefined)
      updateData.processingStatus = params.processingStatus;
    if (params.participantCount !== undefined)
      updateData.participantCount = params.participantCount;

    // 处理其他字段
    if (params.title !== undefined) {
      updateData.title = params.title;
    }
    if (params.meetingCode !== undefined) {
      updateData.meetingCode = params.meetingCode;
    }
    if (params.type !== undefined) {
      updateData.type = params.type;
    }
    if (params.hostUserId !== undefined) {
      updateData.hostId = params.hostUserId;
    }
    if (params.actualStartAt !== undefined) {
      updateData.startAt = params.actualStartAt;
    }
    if (params.endedAt !== undefined) {
      updateData.endAt = params.endedAt;
    }
    if (params.duration !== undefined) {
      updateData.durationSeconds = params.duration;
    }
    if (params.metadata !== undefined) {
      updateData.metadata = params.metadata as Prisma.InputJsonValue;
    }

    return this.meetingRepository.update(id, updateData);
  }

  /**
   * 删除会议记录（软删除）
   */
  async deleteMeetingRecord(id: string): Promise<MeetingRecordResponseDto> {
    const record = await this.meetingRepository.findById(id);
    if (!record) {
      throw new MeetingRecordNotFoundException(id);
    }
    await this.meetingRepository.softDelete(id);
    return record;
  }

  /**
   * 获取会议统计信息
   */
  getMeetingStats(params: {
    startDate?: Date;
    endDate?: Date;
    platform?: string;
  }): MeetingStatsResponseDto {
    void params;
    // TODO: 实现统计逻辑 - 根据日期范围、平台等条件统计会议数据
    // - 统计会议总数
    // - 按平台分组统计
    // - 按状态分组统计
    // - 按类型分组统计
    // - 获取最近会议记录
    return {
      total: 0,
      platformStats: [],
      statusStats: [],
      typeStats: [],
      recentMeetings: [],
    };
  }

  /**
   * 重新处理会议记录
   */
  async reprocessMeetingRecord(id: string): Promise<MeetingRecordResponseDto> {
    const record = await this.meetingRepository.findById(id);
    if (!record) {
      throw new MeetingRecordNotFoundException(id);
    }

    // 重置处理状态
    await this.meetingRepository.update(id, {
      processingStatus: ProcessingStatus.PROCESSING,
    });

    // 重新处理录制文件
    // 这里可以根据需要重新调用处理逻辑

    // 返回更新后的记录
    const updatedRecord = await this.meetingRepository.findById(id);
    if (!updatedRecord) {
      throw new MeetingRecordNotFoundException(id);
    }

    return updatedRecord;
  }

  /**
   * 获取录制的转写文本
   */
  async getTranscriptByRecordingId(recordingId: string): Promise<string> {
    const transcript = await this.transcriptRepository.findDetails(recordingId);
    if (!transcript) {
      return '';
    }

    // 按时间排序段落、句子和词
    const paragraphs = Array.from(transcript.paragraphs).sort(
      (a, b) => Number(a.startTimeMs) - Number(b.startTimeMs),
    );

    let fullText = '';
    for (const p of paragraphs) {
      const sentences = Array.from(p.sentences).sort(
        (a, b) => Number(a.startTimeMs) - Number(b.startTimeMs),
      );
      let paragraphText = '';
      for (const s of sentences) {
        if (s.text) {
          paragraphText += s.text;
        } else {
          const words = Array.from(s.words).sort(
            (a, b) => Number(a.startTimeMs) - Number(b.startTimeMs),
          );
          paragraphText += words.map((w) => w.text).join('');
        }
      }
      if (paragraphText) {
        const speakerName = p.speaker?.displayName || '未知发言人';
        const startMs = Number(p.startTimeMs);
        const hh = String(Math.floor(startMs / 3600000)).padStart(2, '0');
        const mm = String(Math.floor((startMs % 3600000) / 60000)).padStart(
          2,
          '0',
        );
        const ss = String(Math.floor((startMs % 60000) / 1000)).padStart(
          2,
          '0',
        );
        const timeStr = `${hh}:${mm}:${ss}`;

        fullText += `${speakerName}(${timeStr}): ${paragraphText}\n\n`;
      }
    }

    return fullText.trim();
  }
}
