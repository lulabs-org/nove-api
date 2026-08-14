import type { TrackingCadence, TrackingReportType } from '@prisma/client';
import type { UserPair } from './domain.types';

/**
 * Redis 中存储的 job 数据——Date 会被序列化为字符串，故 baseDate 是 string。
 * 不继承 TriggerSummaryDto 以避免 Date vs string 的类型冲突。
 */
export interface ReportGenerationJobData {
  cadence: TrackingCadence;
  /** ISO 8601 字符串，processor 内部还原为 Date */
  baseDate?: string;
  platformUserIds?: string[];
  subjectUserIds?: string[];
  /** 双向解析后的用户 ID 组合对列表 */
  userPairs?: UserPair[];
  trackingType?: TrackingReportType;
  force?: boolean;
  /** 数据完整性警告（当周期尚未结束时设置） */
  dataWarning?: string;
}

export interface ReportGenerationJobResult {
  successCount: number;
  failedCount: number;
  failedUsers: string[];
  /** 无会议数据被跳过的用户数 */
  skippedCount: number;
  /** 无会议数据被跳过的 platformUserId 列表 */
  skippedUsers: string[];
  dataWarning?: string;
  completedAt: string;
}

export interface ReportGenerationJobProgress {
  totalUsers: number;
  processedUsers: number;
  successCount: number;
  failedCount: number;
}
