import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { TranscriptByRecordingIdResponseDto } from '../dto/transcript.dto';

export const ApiGetTranscriptByRecordingIdDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '获取录制的转写文本',
      description: '根据录制记录ID获取其对应的转写文本',
    }),
    ApiParam({
      name: 'id',
      description: '录制记录ID',
      type: 'string',
    }),
    ApiQuery({
      name: 'format',
      required: false,
      description: '返回格式: text (默认) 或 json',
      enum: ['text', 'json'],
    }),
    ApiResponse({
      status: 200,
      description: '获取成功',
      type: TranscriptByRecordingIdResponseDto,
    }),
    ApiResponse({
      status: 404,
      description: '转写记录不存在',
    }),
    ApiResponse({ status: 500, description: '服务器内部错误' }),
  );
