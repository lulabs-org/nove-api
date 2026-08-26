import { Injectable, Logger } from '@nestjs/common';
import { LarkClient } from '../lark.client'; // 你自己的 LarkClient

/**
 * 飞书会议录制文件信息接口
 */
export interface MinuteFile {
  url?: string;
  duration?: string;
}

/**
 * 获取会议录制文件响应接口
 */
export interface GetMinuteResponse {
  recording?: MinuteFile;
}

@Injectable()
export class MinuteService {
  private readonly logger = new Logger(MinuteService.name);

  constructor(private readonly larkClient: LarkClient) {}

  /**
   * 获取飞书会议录制文件信息
   * @param meetingId 会议ID
   */
  async getMinuteInfo(meetingId: string): Promise<GetMinuteResponse> {
    try {
      // 直接调用 VC 接口，SDK 自动管理 token
      const response = await this.larkClient.vc.v1.meetingRecording.get({
        path: { meeting_id: meetingId },
      });

      // this.logger.debug(`Meeting recording retrieved for ${meetingId}`);

      // 给默认值，确保返回值不为 undefined
      return response.data ?? {};
    } catch (error: any) {
      this.logger.error('Failed to get meeting recording', error);
      throw error;
    }
  }
}
