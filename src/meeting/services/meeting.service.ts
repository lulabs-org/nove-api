import { Injectable } from '@nestjs/common';
import { ProcessingStatus, Prisma } from '@prisma/client';
import { MeetingRepository } from '../repositories/meeting.repository';
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

const ROOT_SUB_MEETING_ID = '__ROOT__';

/**
 * 核心会议服务
 * 负责协调各平台服务和文件处理器
 */
@Injectable()
export class MeetingService {
  constructor(private readonly meetingRepository: MeetingRepository) {}

  /**
   * 获取会议记录列表
   */
  async findMany(params: GetMeetingRecordsParams): Promise<{
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
  async findById(id: string): Promise<MeetingRecordResponseDto> {
    const record = await this.meetingRepository.findById(id);
    if (!record) {
      throw new MeetingRecordNotFoundException(id);
    }
    return record;
  }

  /**
   * 创建会议记录
   */
  async create(
    params: CreateMeetingRecordDto,
  ): Promise<MeetingRecordResponseDto> {
    // 检查是否已存在
    const existing = await this.meetingRepository.findByPt(
      params.platform,
      params.platformMeetingId,
      ROOT_SUB_MEETING_ID,
    );

    if (existing) {
      throw new MeetingRecordAlreadyExistsException(
        params.platformMeetingId,
        ROOT_SUB_MEETING_ID,
      );
    }

    // 转换DTO到repository数据格式
    const createData = {
      platform: params.platform,
      meetingId: params.platformMeetingId,
      subMeetingId: ROOT_SUB_MEETING_ID,
      title: params.title,
      meetingCode: params.meetingCode || '',
      type: params.type,
      hostId:
        params.hostUserId && params.hostUserId.trim() !== ''
          ? params.hostUserId
          : null,
      startAt: params.actualStartAt ? params.actualStartAt : new Date(),
      endAt: params.endedAt ? params.endedAt : new Date(),
      durationSeconds: params.durationSeconds ?? 0,
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
  async update(
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
    if (params.durationSeconds !== undefined) {
      updateData.durationSeconds = params.durationSeconds;
    }
    if (params.metadata !== undefined) {
      updateData.metadata = params.metadata as Prisma.InputJsonValue;
    }

    return this.meetingRepository.update(id, updateData);
  }

  /**
   * 删除会议记录（软删除）
   */
  async delete(
    id: string,
  ): Promise<MeetingRecordResponseDto & { deletedAt: Date }> {
    const record = await this.meetingRepository.findById(id);
    if (!record) {
      throw new MeetingRecordNotFoundException(id);
    }
    return this.meetingRepository.softDelete(id);
  }

  /**
   * 获取会议统计信息
   */
  async getStats(params: {
    startDate?: Date;
    endDate?: Date;
  }): Promise<MeetingStatsResponseDto> {
    return this.meetingRepository.getStats(params);
  }
}
