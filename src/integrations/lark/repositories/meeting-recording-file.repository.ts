import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { BitableService } from '../services/bitable.service';
import {
  CreateRecordResponse,
  UpdateRecordResponse,
    SearchRecordResponse,
  BitableField,
  SearchFilter,
} from '../types/lark-bitable.types';
import { larkConfig } from '@/configs';
import { RecordingFileData } from '../types';


/**
 * Repository for recording file-related Bitable operations
 * Provides data access abstraction for recording file record management
 */
@Injectable()
export class RecordingFileBitableRepository {
  private readonly logger = new Logger(RecordingFileBitableRepository.name);
  private readonly appToken: string;
  private readonly tableId: string;

  constructor(
    private readonly bitableService: BitableService,
    @Inject(larkConfig.KEY) private readonly cfg: ConfigType<typeof larkConfig>,
  ) {
    this.appToken = this.cfg.bitable.appToken;
    this.tableId = this.cfg.bitable.tableIds.recordingFile;

    if (!this.appToken || !this.tableId) {
      throw new Error(
        'LARK_BITABLE_APP_TOKEN and LARK_TABLE_MEETING_RECORD_FILE must be configured in environment variables',
      );
    }
  }

  /**
   * Create a recording file record in Bitable (without checking for duplicates)
   * This method will always create a new record
   */
  async createRecordingFileRecord(
    recordingData: RecordingFileData,
  ): Promise<CreateRecordResponse> {
    const fields: BitableField = {
      record_file_id: recordingData.record_file_id,
      ...(recordingData.meet && {
        meet: recordingData.meet,
      }),
      ...(recordingData.participants && {
        participants: recordingData.participants,
      }),
      ...(recordingData.start_time && { start_time: recordingData.start_time }),
      ...(recordingData.end_time && { end_time: recordingData.end_time }),
      ...(recordingData.meeting_summary && {
        meeting_summary: recordingData.meeting_summary,
      }),
      ...(recordingData.ai_meeting_transcripts && {
        ai_meeting_transcripts: recordingData.ai_meeting_transcripts,
      }),
      ...(recordingData.ai_minutes && { ai_minutes: recordingData.ai_minutes }),
      ...(recordingData.todo && { todo: recordingData.todo }),
      ...(recordingData.fullsummary && {
        fullsummary: recordingData.fullsummary,
      }),
    };

    this.logger.log(
      `Creating new recording file record: ${recordingData.record_file_id}`,
    );
    return this.bitableService.createRecord(
      this.appToken,
      this.tableId,
      fields,
    );
  }

  /**
   * Create or update a recording file record in Bitable
   * If a record with the same record_file_id exists, update it
   * Otherwise, create a new record
   */
  async upsertRecordingFileRecord(
    recordingData: RecordingFileData,
  ): Promise<CreateRecordResponse | UpdateRecordResponse> {
    const fields: BitableField = {
      record_file_id: recordingData.record_file_id,
      ...(recordingData.meet && {
        meet: recordingData.meet,
      }),
      ...(recordingData.participants && {
        participants: recordingData.participants,
      }),
      ...(recordingData.start_time && { start_time: recordingData.start_time }),
      ...(recordingData.end_time && { end_time: recordingData.end_time }),
      ...(recordingData.meeting_summary && {
        meeting_summary: recordingData.meeting_summary,
      }),
      ...(recordingData.ai_meeting_transcripts && {
        ai_meeting_transcripts: recordingData.ai_meeting_transcripts,
      }),
      ...(recordingData.ai_minutes && { ai_minutes: recordingData.ai_minutes }),
      ...(recordingData.todo && { todo: recordingData.todo }),
      ...(recordingData.fullsummary && {
        fullsummary: recordingData.fullsummary,
      }),
    };

    try {
      // 使用通用的 upsertRecord 方法
      const result = await this.bitableService.upsertRecord(
        this.appToken,
        this.tableId,
        fields,
        {
          matchFields: ['record_file_id'],
          matchMode: 'exact',
          caseSensitive: false,
        },
        {
          mergeFields: false,
          returnFullRecord: true,
        },
      );

      this.logger.log(
        `${result.action === 'created' ? 'Creating' : 'Updating'} recording file record: ${recordingData.record_file_id}`,
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
      this.logger.error(`Error in upsertRecordingFileRecord: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Search recording file records by record_file_id
   */
  async searchRecordingFileById(recordFileId: string): Promise<SearchRecordResponse> {
    const searchConditions: Array<{
      field_name: string;
      operator: 'is';
      value: string[];
    }> = [
      {
        field_name: 'record_file_id',
        operator: 'is',
        value: [String(recordFileId)],
      },
    ];

    const filter: SearchFilter = {
      conjunction: 'and',
      conditions: searchConditions,
    };

    try {
      this.logger.log(
        `Searching recording file by record_file_id: ${recordFileId}`,
      );
      return await this.bitableService.searchRecords(
        this.appToken,
        this.tableId,
        { filter },
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error in searchRecordingFileById: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Search recording file records by meeting summary content
   */
  async searchRecordingFileBySummary(meetingSummary: string): Promise<any> {
    const searchConditions: Array<{
      field_name: string;
      operator: 'contains';
      value: string[];
    }> = [
      {
        field_name: 'meeting_summary',
        operator: 'contains',
        value: [String(meetingSummary)],
      },
    ];

    const filter: SearchFilter = {
      conjunction: 'and',
      conditions: searchConditions,
    };

    try {
      this.logger.log(
        `Searching recording file by meeting summary: ${meetingSummary}`,
      );
      return await this.bitableService.searchRecords(
        this.appToken,
        this.tableId,
        { filter },
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error in searchRecordingFileBySummary: ${errorMessage}`,
      );
      throw error;
    }
  }

  /**
   * Search recording file records by time range
   */
  async searchRecordingFileByTimeRange(
    startTime: number,
    endTime: number,
  ): Promise<any> {
    const searchConditions: Array<{
      field_name: string;
      operator: 'isGreaterEqual' | 'isLessEqual';
      value: string[];
    }> = [
      {
        field_name: 'start_time',
        operator: 'isGreaterEqual',
        value: [String(startTime)],
      },
      {
        field_name: 'start_time',
        operator: 'isLessEqual',
        value: [String(endTime)],
      },
    ];

    const filter: SearchFilter = {
      conjunction: 'and',
      conditions: searchConditions,
    };

    try {
      this.logger.log(
        `Searching recording file by time range: ${startTime} - ${endTime}`,
      );
      return await this.bitableService.searchRecords(
        this.appToken,
        this.tableId,
        { filter },
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error in searchRecordingFileByTimeRange: ${errorMessage}`,
      );
      throw error;
    }
  }
}
