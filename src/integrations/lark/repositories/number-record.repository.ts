/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-10-04 22:34:39
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-10-06 07:34:37
 * @FilePath: /lulab_backend/src/integrations/lark/repositories/number-record.repository.ts
 * @Description:
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BitableService } from '../services/bitable.service';
import {
  CreateRecordResponse,
  UpdateRecordResponse,
  BitableField,
  SearchFilter,
} from '../types/lark-bitable.types';
import { NumberRecordData, UpdateNumberRecordData } from '../types';
import { SystemConfigService } from '@/admin/system-config/services/system-config.service';
import { OnEvent } from '@nestjs/event-emitter';
import { SystemConfigValues } from '@/admin/system-config/registries/system-config.registry';

/**
 * Repository layer for Number Record Bitable operations
 * This provides a data access abstraction for participant meeting summary related business use cases
 */
@Injectable()
export class NumberRecordBitableRepository implements OnModuleInit {
  private readonly logger = new Logger(NumberRecordBitableRepository.name);
  private appToken: string;
  private tableId: string;

  constructor(
    private readonly bitableService: BitableService,
    private readonly systemConfigService: SystemConfigService,
  ) {
    this.appToken = '';
    this.tableId = '';
  }

  async onModuleInit() {
    const { value } = await this.systemConfigService.getEffectiveConfig('lark');
    this.applyConfig(value);
  }

  @OnEvent('config.lark.updated')
  @OnEvent('config.lark.deleted')
  applyConfig(value: SystemConfigValues) {
    this.appToken = String(value.bitableAppToken ?? '');
    this.tableId = String(value.personalSummaryTableId ?? '');
  }

  /**
   * Create a number record in Bitable (without checking for duplicates)
   * This method will always create a new record
   */
  async createNumberRecord(
    recordData: NumberRecordData,
  ): Promise<CreateRecordResponse> {
    const fields: BitableField = {
      meet_participant: recordData.meet_participant,
      participant_summary: recordData.participant_summary,
      record_file: recordData.record_file,
    };

    this.logger.log(
      `Creating new number record with participants: ${recordData.meet_participant.join(', ')}`,
    );
    return this.bitableService.createRecord(
      this.appToken,
      this.tableId,
      fields,
    );
  }

  /**
   * Create or update a number record in Bitable
   * If a record with the same meet_participant exists, update it
   * Otherwise, create a new record
   */
  async upsertNumberRecord(
    recordData: NumberRecordData,
  ): Promise<CreateRecordResponse | UpdateRecordResponse> {
    const fields: BitableField = {
      meet_participant: recordData.meet_participant,
      participant_summary: recordData.participant_summary,
      record_file: recordData.record_file,
    };

    try {
      // 使用通用的 upsertRecord 方法
      const result = await this.bitableService.upsertRecord(
        this.appToken,
        this.tableId,
        fields,
        {
          matchFields: ['meet_participant'],
          matchMode: 'partial',
          caseSensitive: false,
        },
        {
          mergeFields: false,
          returnFullRecord: true,
        },
      );

      this.logger.log(
        `${result.action === 'created' ? 'Creating' : 'Updating'} number record with participants: ${recordData.meet_participant.join(', ')}`,
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
      this.logger.error(`Error in upsertNumberRecord: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Search number records by meet_participant
   */
  async searchNumberRecordByParticipants(
    participants: string[],
  ): Promise<unknown> {
    const searchConditions: Array<{
      field_name: string;
      operator: 'is';
      value: string[];
    }> = [
      {
        field_name: 'meet_participant',
        operator: 'is',
        value: participants,
      },
    ];

    const filter: SearchFilter = {
      conjunction: 'and',
      conditions: searchConditions,
    };

    try {
      this.logger.log(
        `Searching number record by participants: ${participants.join(', ')}`,
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
        `Error in searchNumberRecordByParticipants: ${errorMessage}`,
      );
      throw error;
    }
  }

  /**
   * Update number record by record ID
   */
  async updateNumberRecordById(
    recordId: string,
    updateData: UpdateNumberRecordData,
  ): Promise<UpdateRecordResponse> {
    const fields: BitableField = {
      ...(updateData.meet_participant && {
        meet_participant: updateData.meet_participant,
      }),
      ...(updateData.participant_summary && {
        participant_summary: updateData.participant_summary,
      }),
      ...(updateData.record_file && { record_file: updateData.record_file }),
    };

    try {
      this.logger.log(`Updating number record: ${recordId}`);
      return await this.bitableService.updateRecord(
        this.appToken,
        this.tableId,
        recordId,
        fields,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Error in updateNumberRecordById: ${errorMessage}`);
      throw error;
    }
  }
}
