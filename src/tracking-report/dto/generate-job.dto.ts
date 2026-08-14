import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TrackingCadence } from '@prisma/client';

export type GenerateJobStatus = 'queued' | 'active' | 'completed' | 'failed' | 'unknown' | 'expired';


export class TriggerResponseDto {
  @ApiProperty({ description: 'BullMQ Job ID，用于后续查询状态' })
  jobId: string;

  @ApiProperty({
    description: '入队状态',
    example: 'queued',
    enum: ['queued'],
  })
  status: 'queued';

  @ApiProperty({ enum: TrackingCadence, description: '触发的周期类型' })
  cadence: TrackingCadence;

  @ApiPropertyOptional({
    description: '数据完整性警告（如周期未结束时生成）',
  })
  dataWarning?: string;
}

export class JobProgressDto {
  @ApiProperty() totalUsers: number;
  @ApiProperty() processedUsers: number;
  @ApiProperty() successCount: number;
  @ApiProperty() failedCount: number;
}

export class JobStatusResponseDto {
  @ApiProperty({ description: 'BullMQ Job ID' })
  jobId: string;

  @ApiProperty({
    description: 'job 状态',
    enum: ['queued', 'active', 'completed', 'failed', 'unknown'],
  })
  status: GenerateJobStatus;

  @ApiProperty({ enum: TrackingCadence })
  cadence: TrackingCadence;

  @ApiPropertyOptional({ description: 'job 入队时间 (ISO 8601)' })
  enqueuedAt?: string;

  @ApiPropertyOptional({ description: 'job 开始执行时间 (ISO 8601)' })
  startedAt?: string;

  @ApiPropertyOptional({ description: 'job 完成时间 (ISO 8601)' })
  completedAt?: string;

  @ApiPropertyOptional({ description: '执行进度 (0–100)' })
  progress?: number;

  @ApiPropertyOptional({ description: '成功生成报告的用户数' })
  successCount?: number;

  @ApiPropertyOptional({ description: '生成失败的用户数' })
  failedCount?: number;

  @ApiPropertyOptional({
    description: '生成失败的 platformUserId 列表',
    type: [String],
  })
  failedUsers?: string[];

  @ApiPropertyOptional({ description: '失败时的错误信息' })
  error?: string;

  @ApiPropertyOptional({ description: '无会议数据被跳过的用户数' })
  skippedCount?: number;

  @ApiPropertyOptional({
    description: '无会议数据被跳过的 platformUserId 列表',
    type: [String],
  })
  skippedUsers?: string[];

  @ApiPropertyOptional({
    description: '数据完整性警告（如周期未结束时生成）',
  })
  dataWarning?: string;

  @ApiPropertyOptional({
    description: '当 status=expired 时，说明 job 已超过保留期限',
  })
  note?: string;
}

export class ConflictResponseDto {
  @ApiProperty({ example: 409 }) statusCode: number;
  @ApiProperty({ example: '相同 cadence + 周期的任务正在运行，请稍后再试' })
  message: string;
  @ApiPropertyOptional({ description: '正在运行的 job ID（并发冲突时）' })
  runningJobId?: string;
  @ApiPropertyOptional({ description: '该周期已存在的报告数量（已有报告冲突时）' })
  existingCount?: number;
  @ApiPropertyOptional({ description: '周期起始时间 ISO 8601（已有报告冲突时）' })
  periodStart?: string;
  @ApiPropertyOptional({ description: '周期结束时间 ISO 8601（已有报告冲突时）' })
  periodEnd?: string;
  @ApiPropertyOptional({ description: '操作提示' })
  hint?: string;
}
