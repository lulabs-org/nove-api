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

      const meetingData = this.extractMeetingData(meetingDetail);

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
        status: meetingData.status,
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

  private extractMeetingData(meetingDetail: MeetingDetailResponse): {
    title: string;
    meetingCode: string;
    description: string | null;
    type: MeetingType;
    status: string;
    startAt: Date | null;
    endAt: Date | null;
    durationSeconds: number | null;
    participantCount: number | null;
    hostId: string | null;
    metadata: Prisma.InputJsonValue;
  } {
    const meetingInfo = meetingDetail.meeting_info_list?.[0] || meetingDetail;

    const startTime = meetingInfo.start_time
      ? new Date(meetingInfo.start_time)
      : null;
    const endTime = meetingInfo.end_time
      ? new Date(meetingInfo.end_time)
      : null;
    const durationSeconds =
      startTime && endTime
        ? Math.floor((endTime.getTime() - startTime.getTime()) / 1000)
        : null;

    const hostId =
      meetingInfo.hosts?.[0]?.userid ||
      (
        meetingDetail as MeetingDetailResponse & {
          creator?: { userid: string };
        }
      ).creator?.userid ||
      null;

    return {
      title: meetingInfo.subject || meetingDetail.subject || '',
      meetingCode:
        meetingInfo.meeting_code ||
        meetingDetail.meeting_code ||
        meetingDetail.meeting_number?.toString() ||
        '',
      description:
        (
          meetingDetail as MeetingDetailResponse & {
            description?: string;
          }
        ).description || null,
      type: this.mapMeetingType(meetingInfo.meeting_type || meetingDetail.type),
      status: meetingInfo.status || meetingDetail.status || '',
      startAt: startTime,
      endAt: endTime,
      durationSeconds,
      participantCount: meetingInfo.participants?.length || null,
      hostId,
      metadata: {
        meetingNumber: meetingDetail.meeting_number,
        joinUrl: meetingInfo.join_url || meetingDetail.join_url,
        password: meetingInfo.password || meetingDetail.password,
        needPassword: meetingInfo.need_password || meetingDetail.need_password,
        settings: meetingInfo.settings || meetingDetail.settings,
        recurringRule:
          meetingInfo.recurring_rule || meetingDetail.recurring_rule,
        liveConfig: meetingInfo.live_config || meetingDetail.live_config,
        enableLive: meetingInfo.enable_live || meetingDetail.enable_live,
        subMeetings: meetingInfo.sub_meetings || meetingDetail.sub_meetings,
        currentSubMeetingId:
          meetingInfo.current_sub_meeting_id ||
          meetingDetail.current_sub_meeting_id,
        rawMeetingDetail: meetingDetail,
      } as unknown as Prisma.InputJsonValue,
    };
  }

  private mapMeetingType(type?: number): MeetingType {
    if (!type) return MeetingType.SCHEDULED;

    const typeMap: Record<number, MeetingType> = {
      0: MeetingType.SCHEDULED,
      1: MeetingType.INSTANT,
      2: MeetingType.SCHEDULED,
      3: MeetingType.SCHEDULED,
    };

    return typeMap[type] || MeetingType.SCHEDULED;
  }
}
