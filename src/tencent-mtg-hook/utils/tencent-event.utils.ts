import {
  TencentMeetingCreateFrom,
  TencentMeetingType,
  TencentInstanceType,
  TencentMeetingEventType,
} from '../enums/tencent-base.enum';
import {
  TencentMeetingEvent,
  TencentEventMeetingInfo,
  TencentEventOperator,
} from '../types/tencent-event.types';
import { MeetingType } from '@prisma/client';

// 类型工具函数
export class TencentEventUtils {
  /**
   * 判断是否为周期性会议
   */
  static isRecurring(meetingInfo: TencentEventMeetingInfo): boolean {
    return meetingInfo.meeting_type === TencentMeetingType.RECURRING;
  }

  /**
   * 判断是否为子会议
   */
  static isSubMeeting(meetingInfo: TencentEventMeetingInfo): boolean {
    return !!meetingInfo.sub_meeting_id;
  }

  /**
   * 获取会议的实际开始时间
   * 对于子会议，返回子会议开始时间；否则返回主会议开始时间
   */
  static getStartTime(meetingInfo: TencentEventMeetingInfo): number {
    return meetingInfo.sub_meeting_start_time || meetingInfo.start_time;
  }

  /**
   * 获取会议的实际结束时间
   * 对于子会议，返回子会议结束时间；否则返回主会议结束时间
   */
  static getEndTime(meetingInfo: TencentEventMeetingInfo): number {
    return meetingInfo.sub_meeting_end_time || meetingInfo.end_time;
  }

  /**
   * 获取会议创建来源的描述文本
   */
  static getCreateFromDesc(createFrom: TencentMeetingCreateFrom): string {
    switch (createFrom) {
      case TencentMeetingCreateFrom.EMPTY:
        return '空来源';
      case TencentMeetingCreateFrom.CLIENT:
        return '客户端';
      case TencentMeetingCreateFrom.WEB:
        return 'Web端';
      case TencentMeetingCreateFrom.WECHAT_WORK:
        return '企业微信';
      case TencentMeetingCreateFrom.WECHAT:
        return '微信';
      case TencentMeetingCreateFrom.OUTLOOK:
        return 'Outlook';
      case TencentMeetingCreateFrom.REST_API:
        return 'REST API';
      case TencentMeetingCreateFrom.TENCENT_DOCS:
        return '腾讯文档';
      case TencentMeetingCreateFrom.ROOMS_SMART_RECORDING:
        return 'Rooms智能录制';
      default:
        return '未知来源';
    }
  }

  /**
   * 获取会议类型的描述文本
   */
  static getMeetingTypeDesc(meetingType: TencentMeetingType): string {
    switch (meetingType) {
      case TencentMeetingType.ONE_TIME:
        return '一次性会议';
      case TencentMeetingType.RECURRING:
        return '周期性会议';
      case TencentMeetingType.WECHAT_EXCLUSIVE:
        return '微信专属会议';
      case TencentMeetingType.ROOMS_SCREEN_SHARE:
        return 'Rooms投屏会议';
      case TencentMeetingType.PERSONAL_MEETING_ID:
        return '个人会议号会议';
      default:
        return '未知会议类型';
    }
  }

  /**
   * 获取终端设备类型的描述文本
   */
  static getInstanceTypeDesc(instanceType: TencentInstanceType): string {
    switch (instanceType) {
      case TencentInstanceType.UNKNOWN:
        return '未知设备';
      case TencentInstanceType.PC:
        return 'PC端';
      case TencentInstanceType.MOBILE:
        return '移动端';
      case TencentInstanceType.WEB:
        return 'Web端';
      case TencentInstanceType.ROOMS:
        return 'Rooms设备';
      case TencentInstanceType.PHONE:
        return '电话接入';
      case TencentInstanceType.OUTDOOR:
        return '户外设备';
      default:
        return '未知设备';
    }
  }

  /**
   * 验证事件数据是否完整有效
   */
  static validateEvent(event: TencentMeetingEvent): boolean {
    if (
      !event ||
      !event.event ||
      !event.payload ||
      !Array.isArray(event.payload)
    ) {
      return false;
    }

    return event.payload.every((payload) => {
      if (!payload.operate_time) {
        return false;
      }

      const eventType = event.event as TencentMeetingEventType;

      switch (eventType) {
        case TencentMeetingEventType.MEETING_STARTED:
        case TencentMeetingEventType.MEETING_PARTICIPANT_JOINED:
        case TencentMeetingEventType.MEETING_PARTICIPANT_LEFT:
        case TencentMeetingEventType.MEETING_END:
        case TencentMeetingEventType.SMART_TRANSCRIPTS: {
          const p = payload as {
            operator?: unknown;
            meeting_info?: unknown;
          };
          return (
            !!p.operator &&
            !!p.meeting_info &&
            !!(p.meeting_info as TencentEventMeetingInfo).meeting_id &&
            !!(p.meeting_info as TencentEventMeetingInfo).meeting_code &&
            !!(p.meeting_info as TencentEventMeetingInfo).subject &&
            !!(p.meeting_info as TencentEventMeetingInfo).creator
          );
        }
        case TencentMeetingEventType.RECORDING_COMPLETED: {
          const p = payload as {
            meeting_info?: unknown;
            recording_files?: unknown;
          };
          return (
            !!p.meeting_info &&
            !!(p.meeting_info as TencentEventMeetingInfo).meeting_id &&
            !!(p.meeting_info as TencentEventMeetingInfo).meeting_code &&
            !!(p.meeting_info as TencentEventMeetingInfo).subject &&
            !!(p.meeting_info as TencentEventMeetingInfo).creator &&
            !!p.recording_files
          );
        }
        case TencentMeetingEventType.SMART_FULLSUMMARY: {
          const p = payload as {
            recording_files?: unknown;
          };
          return !!p.recording_files;
        }
        default:
          return false;
      }
    });
  }

  /**
   * 将腾讯会议类型转换为系统会议类型
   */
  static convertMeetingType(tencentMeetingType: number): MeetingType {
    const meetingType = tencentMeetingType as TencentMeetingType;

    switch (meetingType) {
      case TencentMeetingType.ONE_TIME: // 一次性会议
        return MeetingType.ONE_TIME;
      case TencentMeetingType.RECURRING: // 周期性会议
        return MeetingType.RECURRING;
      case TencentMeetingType.WECHAT_EXCLUSIVE: // 微信专属会议
      case TencentMeetingType.ROOMS_SCREEN_SHARE: // rooms 投屏会议
        return MeetingType.INSTANT;
      case TencentMeetingType.PERSONAL_MEETING_ID: // 个人会议号会议
        return MeetingType.SCHEDULED;
      default:
        return MeetingType.SCHEDULED;
    }
  }

  /**
   * 获取事件的简短描述
   */
  static getEventDesc(event: TencentMeetingEvent): string {
    const payload = event.payload?.[0];
    if (!payload) return '未知事件';

    const eventType = event.event as TencentMeetingEventType;

    switch (eventType) {
      case TencentMeetingEventType.MEETING_STARTED:
      case TencentMeetingEventType.MEETING_PARTICIPANT_JOINED:
      case TencentMeetingEventType.MEETING_PARTICIPANT_LEFT:
      case TencentMeetingEventType.MEETING_END:
      case TencentMeetingEventType.SMART_TRANSCRIPTS: {
        const p = payload as {
          operator?: TencentEventOperator;
          meeting_info?: TencentEventMeetingInfo;
        };
        const meetingInfo = p.meeting_info;
        const operator = p.operator;

        if (!meetingInfo || !operator) {
          switch (eventType) {
            case TencentMeetingEventType.MEETING_STARTED:
              return '会议开始';
            case TencentMeetingEventType.MEETING_END:
              return '会议结束';
            case TencentMeetingEventType.MEETING_PARTICIPANT_JOINED:
              return '用户加入会议';
            case TencentMeetingEventType.MEETING_PARTICIPANT_LEFT:
              return '用户离开会议';
            case TencentMeetingEventType.SMART_TRANSCRIPTS:
              return '智能转写生成完成';
            default:
              return '未知事件';
          }
        }

        switch (eventType) {
          case TencentMeetingEventType.MEETING_STARTED:
            return `会议「${meetingInfo.subject}」开始，由 ${operator.user_name || '未知用户'} 触发`;
          case TencentMeetingEventType.MEETING_END:
            return `会议「${meetingInfo.subject}」结束，由 ${operator.user_name || '未知用户'} 触发`;
          case TencentMeetingEventType.MEETING_PARTICIPANT_JOINED:
            return `${operator.user_name || '未知用户'} 加入会议「${meetingInfo.subject}」`;
          case TencentMeetingEventType.MEETING_PARTICIPANT_LEFT:
            return `${operator.user_name || '未知用户'} 离开会议「${meetingInfo.subject}」`;
          case TencentMeetingEventType.SMART_TRANSCRIPTS:
            return `会议「${meetingInfo.subject}」智能转写生成完成`;
          default:
            return '未知事件';
        }
      }
      case TencentMeetingEventType.RECORDING_COMPLETED: {
        const p = payload as {
          meeting_info?: TencentEventMeetingInfo;
        };
        const meetingInfo = p.meeting_info;

        if (!meetingInfo) return '会议录制完成';
        return `会议「${meetingInfo.subject}」录制完成`;
      }
      case TencentMeetingEventType.SMART_FULLSUMMARY:
        return '智能纪要生成完成';
      default:
        return `${event.event}事件`;
    }
  }
}
