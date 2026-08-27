import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import {
  TranscriptJsonResponseDto,
  TranscriptTextResponseDto,
} from '../dto/transcript.dto';

const transcriptMinuteIdParam = ApiParam({
  name: 'id',
  description: '录制记录ID',
  type: 'string',
});

const transcriptNotFoundResponse = ApiResponse({
  status: 404,
  description: '转写记录不存在',
});

const transcriptInternalErrorResponse = ApiResponse({
  status: 500,
  description: '服务器内部错误',
});

export const ApiGetTranscriptDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '获取结构化录制转写',
      description: '根据录制记录ID获取转写记录和按时间排序的转写段落',
    }),
    transcriptMinuteIdParam,
    ApiQuery({
      name: 'includeLocalUser',
      required: false,
      type: Boolean,
      description: '是否同时返回说话人关联的本地用户资料，默认 false',
    }),
    ApiResponse({
      status: 200,
      description: '获取成功',
      type: TranscriptJsonResponseDto,
    }),
    transcriptNotFoundResponse,
    transcriptInternalErrorResponse,
  );

export const ApiGetTranscriptTextDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '获取录制转写文本',
      description: '根据录制记录ID获取拼接后的可读转写文本',
    }),
    transcriptMinuteIdParam,
    ApiResponse({
      status: 200,
      description: '获取成功',
      type: TranscriptTextResponseDto,
    }),
    transcriptNotFoundResponse,
    transcriptInternalErrorResponse,
  );
