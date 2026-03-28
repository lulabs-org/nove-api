import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { tencentMeetingConfig } from '@/configs/tencent-mtg.config';
import { generateSignature } from '../utils/crypto.util';
import {
  RecordingDetail,
  RecordMeetingsResponse,
  MeetingParticipantsResponse,
  MeetingDetailResponse,
  SmartTopicsResponse,
  SmartFullSummaryResponse,
  SmartMeetingMinutesResponse,
  RecordingTranscriptResponse,
} from '../types';

/**
 * Tencent Meeting API Service
 * Provides methods to interact with Tencent Meeting API endpoints
 * Handles authentication, request signing, and error handling
 */
@Injectable()
export class TencentApiService {
  private readonly BASE_URL = 'https://api.meeting.qq.com';
  private readonly logger = new Logger(TencentApiService.name);

  constructor(
    @Inject(tencentMeetingConfig.KEY)
    private config: ConfigType<typeof tencentMeetingConfig>,
  ) {}

  /**
   * Retrieves Tencent Meeting API configuration from injected config
   * @returns Configuration object containing API credentials and settings
   */
  private getConfig() {
    return {
      secretId: this.config.api.secretId,
      secretKey: this.config.api.secretKey,
      appId: this.config.api.appId,
      sdkId: this.config.api.sdkId,
      userId: this.config.api.userId,
    };
  }

  /**
   * Sends authenticated HTTP request to Tencent Meeting API
   * Handles signature generation, header setup, and response processing
   * @param method - HTTP method (GET, POST, etc.)
   * @param requestUri - API endpoint path
   * @param queryParams - Query parameters for the request
   * @returns Promise resolving to response data of type T
   * @throws Error if API request fails or returns error response
   */
  private async sendRequest<T>(
    method: string,
    requestUri: string,
    queryParams: Record<string, unknown> = {},
  ): Promise<T> {
    try {
      const queryString = new URLSearchParams(
        queryParams as Record<string, string>,
      ).toString();
      const fullRequestUri = queryString
        ? `${requestUri}?${queryString}`
        : requestUri;
      const apiUrl = `${this.BASE_URL}${fullRequestUri}`;

      const timestamp = Math.floor(Date.now() / 1000).toString();
      const nonce = Math.floor(Math.random() * 100000).toString();
      const config = this.getConfig();

      const signature = generateSignature(
        config.secretKey,
        method,
        config.secretId,
        nonce,
        timestamp,
        fullRequestUri,
        '',
      );

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-TC-Key': config.secretId || '',
        'X-TC-Timestamp': timestamp,
        'X-TC-Nonce': nonce,
        'X-TC-Signature': signature,
        AppId: config.appId || '',
        SdkId: config.sdkId || '',
        'X-TC-Registered': '1',
      };

      const response = await fetch(apiUrl, {
        method,
        headers,
      });

      const responseData = (await response.json()) as {
        error_info?: {
          error_code?: number;
          new_error_code?: number;
          message?: string;
        };
      } & T;

      if (responseData.error_info) {
        this.handleApiError(responseData.error_info, fullRequestUri, timestamp);
      }

      return responseData;
    } catch (error: unknown) {
      this.logger.error(
        'API请求失败:',
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }

  /**
   * Handles API error responses from Tencent Meeting API
   * Processes error codes and throws appropriate error messages
   * @param errorInfo - Error information from API response
   * @param requestUri - The API endpoint that caused the error
   * @param timestamp - Request timestamp for debugging
   * @throws Error with detailed error message
   */
  private handleApiError(
    errorInfo: {
      error_code?: number;
      new_error_code?: number;
      message?: string;
    },
    requestUri: string,
    timestamp: string,
  ): never {
    const { error_code, new_error_code, message } = errorInfo;
    const code = new_error_code ?? error_code ?? 0;

    if (code === 500125) {
      throw new Error('IP白名单错误');
    }

    throw new Error(message || `API error at ${requestUri} (${timestamp})`);
  }

  /**
   * Retrieves detailed information about a recording file
   * https://cloud.tencent.com/document/product/1095/51180
   * @param fileId - Unique identifier of the recording file
   * @param userId - User ID making the request
   * @returns Promise resolving to recording file details
   */
  async getRecordingFileDetail(
    fileId: string,
    userId: string,
  ): Promise<RecordingDetail> {
    return this.sendRequest<RecordingDetail>('GET', `/v1/addresses/${fileId}`, {
      userid: userId,
    });
  }

  /**
   * Retrieves corporate meeting records within a specified time range
   * https://cloud.tencent.com/document/product/1095/53224
   * Supports pagination and filtering by operator
   * @param startTime - Start timestamp (Unix timestamp in seconds)
   * @param endTime - End timestamp (Unix timestamp in seconds)
   * @param pageSize - Number of records per page (max 20, default 10)
   * @param page - Page number (default 1)
   * @param operatorId - Optional operator ID for filtering
   * @param operatorIdType - Operator ID type (default 1)
   * @returns Promise resolving to paginated meeting records
   * @throws Error if time range exceeds 31 days
   */
  async getCorpRecords(
    startTime: number,
    endTime: number,
    pageSize: number = 10,
    page: number = 1,
    operatorId?: string,
    operatorIdType: number = 1,
  ): Promise<RecordMeetingsResponse> {
    const maxRange = 31 * 24 * 60 * 60;
    if (endTime - startTime > maxRange) {
      throw new Error('时间区间不允许超过31天');
    }
    const size = Math.min(pageSize, 20);

    return this.sendRequest<RecordMeetingsResponse>('GET', '/v1/corp/records', {
      start_time: startTime,
      end_time: endTime,
      page_size: size,
      page,
      operator_id: operatorId,
      operator_id_type: operatorIdType,
    });
  }

  /**
   * Retrieves detailed information about a specific meeting
   * https://cloud.tencent.com/document/product/1095/93432#9bc6b875-6415-4cda-931e-0d987e4da5bf
   * @param meetingId - Unique meeting identifier
   * @param userId - User ID making the request (required if operatorId is not provided)
   * @param instanceId - Meeting instance ID (default: 1)
   * @param operatorId - Operator ID (optional, if provided takes precedence over userId)
   * @param operatorIdType - Operator ID type (default: 1 for userid)
   * @param subMeetingId - Sub-meeting ID for recurring meetings (optional)
   * @returns Promise resolving to meeting details
   */
  async getMeetingDetail(
    meetingId: string,
    userId?: string,
    instanceId: number = 1,
    operatorId?: string,
    operatorIdType: number = 1,
    subMeetingId?: string,
  ): Promise<MeetingDetailResponse> {
    const queryParams: Record<string, unknown> = {
      instanceid: instanceId,
    };

    // 根据文档，operator_id和userid二者必填一项，若两者都填，以operator_id字段为准
    if (operatorId) {
      queryParams.operator_id = operatorId;
      queryParams.operator_id_type = operatorIdType;
    } else if (userId) {
      queryParams.userid = userId;
    } else {
      throw new Error('Either operatorId or userId must be provided');
    }

    // 添加子会议ID（用于周期性会议）
    if (subMeetingId) {
      queryParams.sub_meeting_id = subMeetingId;
    }

    return this.sendRequest<MeetingDetailResponse>(
      'GET',
      `/v1/meetings/${meetingId}`,
      queryParams,
    );
  }

  /**
   * Retrieves participant list for a specific meeting
   * https://cloud.tencent.com/document/product/1095/42701#7d24527a-e594-4213-95ad-27640a0c49c9
   * @param meetingId - Unique meeting identifier
   * @param userId - User ID making the request
   * @param subMeetingId - Optional sub-meeting ID for recurring meetings
   * @param pos - Pagination starting position for participant list query
   * @param size - Number of participants to retrieve per page (max 100)
   * @param startTime - Filter by participant join start time (Unix timestamp in seconds)
   * @param endTime - Filter by participant join end time (Unix timestamp in seconds)
   * @returns Promise resolving to meeting participants list
   */
  async getParticipants(
    meetingId: string,
    userId: string,
    subMeetingId?: string | null,
    // operatorIdType: number = 1,
    pos?: number,
    size?: number,
    startTime?: number,
    endTime?: number,
  ): Promise<MeetingParticipantsResponse> {
    const queryParams: Record<string, unknown> = {
      userid: userId,
    };

    if (subMeetingId !== undefined) {
      queryParams.sub_meeting_id = subMeetingId;
    }

    // Add pagination parameters if provided
    if (pos !== undefined) {
      queryParams.pos = pos;
    }
    if (size !== undefined) {
      queryParams.size = Math.min(size, 100); // Ensure size doesn't exceed 100
    }

    // Add time filter parameters if provided
    if (startTime !== undefined) {
      queryParams.start_time = startTime;
    }
    if (endTime !== undefined) {
      queryParams.end_time = endTime;
    }

    return this.sendRequest<MeetingParticipantsResponse>(
      'GET',
      `/v1/meetings/${meetingId}/participants`,
      queryParams,
    );
  }

  /**
   * Retrieves AI-generated discussion topics for a recording
   * https://cloud.tencent.com/document/product/1095/105660
   * @param fileId - Unique identifier of the recording file
   * @param userId - User ID making the request
   * @returns Promise resolving to smart discussion topics
   */
  async getSmartTopics(
    fileId: string,
    userId: string,
  ): Promise<SmartTopicsResponse> {
    return this.sendRequest<SmartTopicsResponse>(
      'GET',
      `/v1/recording/${fileId}/topics`,
      { userid: userId },
    );
  }

  /**
   * Retrieves AI-generated full summary for a recording
   * https://cloud.tencent.com/document/product/1095/105661
   * @param recordFileId - Unique identifier of the recording file
   * @param operatorId - Operator ID making the request
   * @param operatorIdType - Operator ID type (1: userid, 2: openid)
   * @param lang - Translation type (default: 'default', options: 'zh', 'en', 'ja')
   * @param pwd - Optional password for accessing the recording file
   * @returns Promise resolving to smart full summary
   */
  async getSmartFullSummary(
    recordFileId: string,
    operatorId: string,
    operatorIdType: number = 1,
    lang?: string,
    pwd?: string,
  ): Promise<SmartFullSummaryResponse> {
    const queryParams: Record<string, unknown> = {
      record_file_id: recordFileId,
      operator_id: operatorId,
      operator_id_type: operatorIdType,
    };

    // Add optional parameters if provided
    if (lang) {
      queryParams.lang = lang;
    }
    if (pwd) {
      queryParams.pwd = pwd;
    }

    return this.sendRequest<SmartFullSummaryResponse>(
      'GET',
      '/v1/smart/fullsummary',
      queryParams,
    );
  }

  /**
   * Retrieves AI-generated meeting minutes for a recording
   * https://cloud.tencent.com/document/product/1095/109458
   * @param recordFileId - Unique identifier of the recording file
   * @param operatorId - Operator ID making the request
   * @param operatorIdType - Operator ID type (1: userid, 2: openid)
   * @param minuteType - Meeting summary return category (1: by chapter, 2: by topic, 3: by speaker)
   * @param textType - Return text type (1: plain text, 2: markdown)
   * @param lang - Translation type (default: 'default', options: 'zh', 'en', 'ja')
   * @param pwd - Optional password for accessing the recording file
   * @param llm - Model selection (1: Hunyuan (default), 2: DeepSeek)
   * @returns Promise resolving to smart meeting minutes
   */
  async getSmartMeetingMinutes(
    recordFileId: string,
    operatorId: string,
    operatorIdType: number = 1,
    minuteType?: number,
    textType?: number,
    lang?: string,
    pwd?: string,
    llm?: number,
  ): Promise<SmartMeetingMinutesResponse> {
    const queryParams: Record<string, unknown> = {
      operator_id: operatorId,
      operator_id_type: operatorIdType,
    };

    // Add optional parameters if provided
    if (minuteType !== undefined) {
      queryParams.minute_type = minuteType;
    }
    if (textType !== undefined) {
      queryParams.text_type = textType;
    }
    if (lang) {
      queryParams.lang = lang;
    }
    if (pwd) {
      queryParams.pwd = pwd;
    }
    if (llm !== undefined) {
      queryParams.llm = llm;
    }

    return this.sendRequest<SmartMeetingMinutesResponse>(
      'GET',
      `/v1/smart/minutes/${recordFileId}`,
      queryParams,
    );
  }

  /**
   * Retrieves recording transcript details for a recording file
   * https://cloud.tencent.com/document/product/1095/65111
   * @param recordFileId - Unique identifier of the recording file
   * @param operatorId - Operator ID making the request
   * @param operatorIdType - Operator ID type (1: userid, 2: openid)
   * @param page - Page number for pagination
   * @param pageSize - Number of transcript entries per page
   * @param pwd - Optional password for accessing the recording file
   * @returns Promise resolving to recording transcript details
   */
  async getTranscript(
    recordFileId: string,
    operatorId: string,
    operatorIdType: number = 1,
    page?: number,
    pageSize?: number,
    pwd?: string,
  ): Promise<RecordingTranscriptResponse> {
    const queryParams: Record<string, unknown> = {
      record_file_id: recordFileId,
      operator_id: operatorId,
      operator_id_type: operatorIdType,
    };

    // Add optional parameters if provided
    if (page !== undefined) {
      queryParams.page = page;
    }
    if (pageSize !== undefined) {
      queryParams.page_size = pageSize;
    }
    if (pwd) {
      queryParams.pwd = pwd;
    }

    return this.sendRequest<RecordingTranscriptResponse>(
      'GET',
      `/v1/records/transcripts/details`,
      queryParams,
    );
  }
}
