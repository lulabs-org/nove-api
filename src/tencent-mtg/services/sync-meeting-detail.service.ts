import { Injectable, Logger } from '@nestjs/common';
import { TencentApiService } from '@/integrations/tencent-meeting/services/api.service';
import { MeetingRepository } from '@/meeting/repositories/meeting.repository';
import { MeetingPlatform, MeetingType } from '@prisma/client';
import type { MeetingDetailResponse } from '@/integrations/tencent-meeting/types';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';

@Injectable()
export class SyncMeetingDetailService {
  private readonly logger = new Logger(SyncMeetingDetailService.name);

  constructor(
    private readonly tencentApiService: TencentApiService,
    private readonly meetingRepository: MeetingRepository,
    private readonly configService: ConfigService,
  ) {}

  async syncMeetingDetail(
    meetingId: string,
    subMeetingId: string = '__ROOT__',
    userId?: string,
  ) {
    this.logger.log(
      `开始同步会议详情: meetingId=${meetingId}, subMeetingId=${subMeetingId}`,
    );

    try {
      const operatorId =
        userId ||
        this.configService.get<string>('tencentMeeting.api.userId') ||
        '';

      if (!operatorId) {
        throw new Error(
          '未提供用户ID且配置文件中未设置默认用户ID，请提供有效的腾讯会议用户ID',
        );
      }

      const meetingDetail = await this.tencentApiService.getMeetingDetail(
        meetingId,
        operatorId,
        1,
        1,
      );

      const meetingData = this.extractMeetingData(meetingDetail, subMeetingId);

      await this.meetingRepository.upsert(
        MeetingPlatform.TENCENT_MEETING,
        meetingId,
        subMeetingId,
        meetingData,
      );

      this.logger.log(
        `会议详情同步成功: meetingId=${meetingId}, subMeetingId=${subMeetingId}`,
      );

      return {
        meetingId,
        subMeetingId,
        title: meetingData.title,
        success: true,
        syncedAt: new Date().toISOString(),
        message: '会议详情同步成功',
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      this.logger.error(
        `会议详情同步失败: meetingId=${meetingId}, subMeetingId=${subMeetingId}, error=${errorMessage}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  private extractMeetingData(
    meetingDetail: MeetingDetailResponse,
    subMeetingId: string,
  ): {
    title: string;
    meetingCode: string;
    type: MeetingType;
    startAt?: Date | null;
    endAt?: Date | null;
    scheduledStartAt?: Date | null;
    scheduledEndAt?: Date | null;
    metadata: Prisma.InputJsonValue;
  } {
    const meetingInfo = meetingDetail.meeting_info_list?.[0];

    if (meetingInfo.meeting_type === 0) {
      const scheduledStartAt = meetingInfo.start_time
        ? new Date(Number(meetingInfo.start_time) * 1000)
        : null;

      const scheduledEndAt = meetingInfo.end_time
        ? new Date(Number(meetingInfo.end_time) * 1000)
        : null;

      return {
        title: meetingInfo.subject || '',
        meetingCode: meetingInfo.meeting_code || '',
        type: this.mapMeetingType(meetingInfo.meeting_type),
        startAt: null,
        endAt: null,
        scheduledStartAt,
        scheduledEndAt,
        metadata: {
          joinUrl: meetingInfo.join_url,
          password: meetingInfo.password,
          settings: meetingInfo.settings,
          recurringRule: meetingInfo.recurring_rule,
          liveConfig: meetingInfo.live_config,
          enableLive: meetingInfo.enable_live,
        } as unknown as Prisma.InputJsonValue,
      };
    }

    if (meetingInfo.meeting_type === 1) {
      const subMeetingStartMs = Number(subMeetingId) * 1000;
      const durationMs = (Number(meetingInfo.end_time) - Number(meetingInfo.start_time)) * 1000;

      const scheduledStartAt = new Date(subMeetingStartMs);
      const scheduledEndAt = new Date(subMeetingStartMs + durationMs);

      return {
        title: meetingInfo.subject || '',
        meetingCode: meetingInfo.meeting_code || '',
        type: this.mapMeetingType(meetingInfo.meeting_type),
        scheduledStartAt,
        scheduledEndAt,
        metadata: {
          joinUrl: meetingInfo.join_url,
          password: meetingInfo.password,
          settings: meetingInfo.settings,
          recurringRule: meetingInfo.recurring_rule,
          liveConfig: meetingInfo.live_config,
          enableLive: meetingInfo.enable_live,
        } as unknown as Prisma.InputJsonValue,
      };
    }

    return {
      title: meetingInfo.subject || '',
      meetingCode: meetingInfo.meeting_code || '',
      type: this.mapMeetingType(meetingInfo.meeting_type),
      metadata: {} as Prisma.InputJsonValue,
    };
  }

  private mapMeetingType(type?: number): MeetingType {
    if (!type) return MeetingType.SCHEDULED;

    const typeMap: Record<number, MeetingType> = {
      0: MeetingType.ONE_TIME,
      1: MeetingType.RECURRING,
    };

    return typeMap[type] || MeetingType.SCHEDULED;
  }
}
