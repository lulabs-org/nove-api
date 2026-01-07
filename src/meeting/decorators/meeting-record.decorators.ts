import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { MeetingPlatform, MeetingType, ProcessingStatus } from '@prisma/client';
import {
  MeetingRecordListResponseDto,
  MeetingStatsResponseDto,
} from '../dto/meeting-record.dto';

/**
 * 获取会议记录列表装饰器
 * 根据查询条件获取会议记录列表，支持分页、筛选和排序
 */
export function ApiGetMeetingRecordsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '获取会议记录列表',
      description: '根据查询条件获取会议记录列表，支持分页、筛选和排序',
    }),
    ApiQuery({
      name: 'platform',
      enum: MeetingPlatform,
      required: false,
      description: '会议平台',
    }),
    ApiQuery({
      name: 'status',
      enum: ProcessingStatus,
      required: false,
      description: '会议状态',
    }),
    ApiQuery({
      name: 'type',
      enum: MeetingType,
      required: false,
      description: '会议类型',
    }),
    ApiQuery({
      name: 'startDate',
      type: String,
      required: false,
      description: '开始日期 (YYYY-MM-DD)',
    }),
    ApiQuery({
      name: 'endDate',
      type: String,
      required: false,
      description: '结束日期 (YYYY-MM-DD)',
    }),
    ApiQuery({
      name: 'page',
      type: Number,
      required: false,
      description: '页码，从1开始',
    }),
    ApiQuery({
      name: 'limit',
      type: Number,
      required: false,
      description: '每页数量',
    }),
    ApiQuery({
      name: 'search',
      type: String,
      required: false,
      description: '搜索关键词（会议主题、主持人等）',
    }),
    ApiResponse({
      status: 200,
      description: '获取成功',
      type: MeetingRecordListResponseDto,
    }),
    ApiResponse({
      status: 400,
      description: '请求参数错误',
    }),
  );
}

export const ApiGetMeetingRecordByIdDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '获取会议记录详情',
      description: '根据会议记录ID获取详细信息，包括文件列表和参会者信息',
    }),
    ApiParam({
      name: 'id',
      description: '会议记录ID',
      type: 'string',
      format: 'uuid',
    }),
    ApiResponse({
      status: 200,
      description: '获取成功',
    }),
    ApiResponse({
      status: 404,
      description: '会议记录不存在',
    }),
    ApiResponse({ status: 500, description: '服务器内部错误' }),
  );

export const ApiCreateMeetingRecordDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '创建会议记录',
      description: '手动创建会议记录',
    }),
    ApiBody({
      description: '会议记录创建参数',
    }),
    ApiResponse({
      status: 201,
      description: '创建成功',
    }),
    ApiResponse({
      status: 400,
      description: '请求参数错误',
    }),
    ApiResponse({
      status: 409,
      description: '会议记录已存在',
    }),
    ApiResponse({ status: 500, description: '服务器内部错误' }),
  );

export const ApiUpdateMeetingRecordDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '更新会议记录',
      description: '更新会议记录信息',
    }),
    ApiParam({
      name: 'id',
      description: '会议记录ID',
      type: 'string',
      format: 'uuid',
    }),
    ApiBody({
      description: '会议记录更新参数',
    }),
    ApiResponse({
      status: 200,
      description: '更新成功',
    }),
    ApiResponse({
      status: 404,
      description: '会议记录不存在',
    }),
    ApiResponse({ status: 500, description: '服务器内部错误' }),
  );

export const ApiDeleteMeetingRecordDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '删除会议记录',
      description: '删除指定的会议记录及其关联的文件',
    }),
    ApiParam({
      name: 'id',
      description: '会议记录ID',
      type: 'string',
      format: 'uuid',
    }),
    ApiResponse({
      status: 204,
      description: '删除成功',
    }),
    ApiResponse({
      status: 404,
      description: '会议记录不存在',
    }),
    ApiResponse({ status: 500, description: '服务器内部错误' }),
  );

export const ApiGetMeetingStatsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '获取会议统计信息',
      description: '获取会议记录的统计信息，包括总数、各平台分布、状态分布等',
    }),
    ApiQuery({
      name: 'startDate',
      type: String,
      required: false,
      description: '统计开始日期 (YYYY-MM-DD)',
    }),
    ApiQuery({
      name: 'endDate',
      type: String,
      required: false,
      description: '统计结束日期 (YYYY-MM-DD)',
    }),
    ApiResponse({
      status: 200,
      description: '获取成功',
      type: MeetingStatsResponseDto,
    }),
    ApiResponse({ status: 500, description: '服务器内部错误' }),
  );

export const ApiReprocessMeetingRecordDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '重新处理会议录制文件',
      description: '重新处理指定会议的录制文件，重新生成AI摘要和转录等',
    }),
    ApiParam({
      name: 'id',
      description: '会议记录ID',
      type: 'string',
      format: 'uuid',
    }),
    ApiResponse({
      status: 200,
      description: '重新处理成功',
    }),
    ApiResponse({
      status: 404,
      description: '会议记录不存在',
    }),
    ApiResponse({ status: 500, description: '服务器内部错误' }),
  );

export const ApiHealthCheckDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '健康检查',
      description: '检查会议服务的运行状态',
    }),
    ApiResponse({
      status: 200,
      description: '服务正常运行',
      schema: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
          timestamp: { type: 'string', example: '2023-12-01T10:00:00.000Z' },
          service: { type: 'string', example: 'meeting-service' },
        },
      },
    }),
    ApiResponse({ status: 500, description: '服务器内部错误' }),
  );
