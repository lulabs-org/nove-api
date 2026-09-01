import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BitableService } from '../services/bitable.service';
import {
  CreateRecordResponse,
  UpdateRecordResponse,
  BitableField,
  SearchFilter,
  SearchRecordResponse,
} from '../types/lark-bitable.types';
import { MeetingData } from '../types';
import {
  SingleOrgContextService,
  SystemConfigChangeEvent,
  SystemConfigService,
} from '@/admin/system-config/services';
import { OnEvent } from '@nestjs/event-emitter';
import { SystemConfigValues } from '@/admin/system-config';

/**
 * Repository for meeting-related Bitable operations
 * Provides data access abstraction for meeting record management
 */
@Injectable()
export class MeetingBitableRepository implements OnModuleInit {
  private readonly logger = new Logger(MeetingBitableRepository.name);
  private appToken: string;
  private tableId: string;

  constructor(
    private readonly bitableService: BitableService,
    private readonly systemConfigService: SystemConfigService,
    private readonly orgContext: SingleOrgContextService,
  ) {
    this.appToken = '';
    this.tableId = '';
  }

  async onModuleInit() {
    const { value } = await this.systemConfigService.getEffectiveConfig(
      this.orgContext.getOrgId(),
      'lark',
    );
    this.applyConfig(value);
  }

  @OnEvent('config.lark.updated')
  @OnEvent('config.lark.deleted')
  handleConfigChange(event: SystemConfigChangeEvent) {
    if (!this.orgContext.matches(event.orgId)) return;
    this.applyConfig(event.value);
  }

  private applyConfig(value: SystemConfigValues) {
    this.appToken = String(value.bitableAppToken ?? '');
    this.tableId = String(value.meetingTableId ?? '');
  }

  /**
   * Create a meeting record in Bitable (without checking for duplicates)
   * This method will always create a new record
   */
  async createMeetingRecord(
    meetingData: MeetingData,
  ): Promise<CreateRecordResponse> {
    const fields: BitableField = {
      platform: meetingData.platform,
      meeting_id: meetingData.meeting_id,
      ...(meetingData.subject && {
        subject: meetingData.subject,
      }),
      ...(meetingData.sub_meeting_id && {
        sub_meeting_id: meetingData.sub_meeting_id,
      }),
      ...(meetingData.meeting_code && {
        meeting_code: meetingData.meeting_code,
      }),
      ...(meetingData.start_time && { start_time: meetingData.start_time }),
      ...(meetingData.end_time && { end_time: meetingData.end_time }),
      ...(meetingData.operator && { operator: meetingData.operator }),
      ...(meetingData.creator && { creator: meetingData.creator }),
      ...(meetingData.participants && {
        participants: meetingData.participants,
      }),
      ...(meetingData.meeting_type && {
        meeting_type: meetingData.meeting_type,
      }),
    };

    this.logger.log(
      `Creating new meeting record: ${meetingData.meeting_id} (sub_meeting_id: ${meetingData.sub_meeting_id || 'none'})`,
    );
    return this.bitableService.createRecord(
      this.appToken,
      this.tableId,
      fields,
    );
  }

  /**
   * Create or update a meeting record in Bitable
   * If a record with the same meeting_id and sub_meeting_id combination exists, update it
   * Otherwise, create a new record
   */
  async upsertMeetingRecord(
    meetingData: MeetingData,
  ): Promise<CreateRecordResponse | UpdateRecordResponse> {
    const fields: BitableField = {
      platform: meetingData.platform,
      meeting_id: meetingData.meeting_id,
      ...(meetingData.subject && {
        subject: meetingData.subject,
      }),
      ...(meetingData.sub_meeting_id && {
        sub_meeting_id: meetingData.sub_meeting_id,
      }),
      ...(meetingData.meeting_code && {
        meeting_code: meetingData.meeting_code,
      }),
      ...(meetingData.start_time && { start_time: meetingData.start_time }),
      ...(meetingData.end_time && { end_time: meetingData.end_time }),
      ...(meetingData.operator && { operator: meetingData.operator }),
      ...(meetingData.creator && { creator: meetingData.creator }),
      ...(meetingData.participants && {
        participants: meetingData.participants,
      }),
      ...(meetingData.meeting_type && {
        meeting_type: meetingData.meeting_type,
      }),
    };

    // 构建匹配字段数组 - 根据是否有 sub_meeting_id 决定匹配字段
    const matchFields = meetingData.sub_meeting_id
      ? ['meeting_id', 'sub_meeting_id']
      : ['meeting_id'];

    try {
      // 使用通用的 upsertRecord 方法
      const result = await this.bitableService.upsertRecord(
        this.appToken,
        this.tableId,
        fields,
        {
          matchFields,
          matchMode: 'exact',
          caseSensitive: false,
        },
        {
          mergeFields: false,
          returnFullRecord: true,
        },
      );

      this.logger.log(
        `${result.action === 'created' ? 'Creating' : 'Updating'} meeting record: ${meetingData.meeting_id} (sub_meeting_id: ${meetingData.sub_meeting_id || 'none'})`,
      );

      // 构建与原有接口兼容的响应
      const response: CreateRecordResponse | UpdateRecordResponse = {
        code: 0,
        msg: 'success',
        data: {
          record: result.record,
        },
      };

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error in upsertMeetingRecord: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Search meeting records by meeting_id and optional sub_meeting_id
   */
  async searchMeetingById(
    meetingId: string,
    subMeetingId?: string,
  ): Promise<SearchRecordResponse> {
    const searchConditions: Array<{
      field_name: string;
      operator: 'is';
      value: string[];
    }> = [
      {
        field_name: 'meeting_id',
        operator: 'is',
        value: [meetingId],
      },
    ];

    // 如果有子会议ID，添加子会议ID条件
    if (subMeetingId) {
      searchConditions.push({
        field_name: 'sub_meeting_id',
        operator: 'is',
        value: [subMeetingId],
      });
    }

    const filter: SearchFilter = {
      conjunction: 'and',
      conditions: searchConditions,
    };

    try {
      this.logger.log(
        `Searching meeting by ID: ${meetingId}${subMeetingId ? ` (sub_meeting_id: ${subMeetingId})` : ''}`,
      );
      return await this.bitableService.searchRecords(
        this.appToken,
        this.tableId,
        { filter },
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error in searchMeetingById: ${errorMessage}`);
      throw error;
    }
  }
}
