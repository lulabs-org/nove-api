// 录制状态枚举 (API 层面)
export enum RecordingStatus {
  PENDING = 'PENDING', // 尚无录制
  RECORDING = 'RECORDING', // 录制中
  PROCESSING = 'PROCESSING', // 处理中
  COMPLETED = 'COMPLETED', // 已完成
  FAILED = 'FAILED', // 失败
}

interface MinuteStatusResources {
  errorMessage?: string | null;
  files?: readonly unknown[];
  transcripts?: readonly unknown[];
  summary?: unknown;
}

export function deriveRecordingStatus(
  minutes: readonly MinuteStatusResources[],
): RecordingStatus {
  if (minutes.length === 0) return RecordingStatus.PENDING;
  if (minutes.some((minute) => minute.errorMessage)) {
    return RecordingStatus.FAILED;
  }
  if (minutes.some((minute) => (minute.files?.length ?? 0) > 0)) {
    return RecordingStatus.COMPLETED;
  }
  return RecordingStatus.RECORDING;
}

export function deriveProcessingStatus(
  minutes: readonly MinuteStatusResources[],
): ProcessingStatus {
  if (minutes.some((minute) => minute.errorMessage)) {
    return ProcessingStatus.FAILED;
  }
  if (minutes.some((minute) => minute.summary)) {
    return ProcessingStatus.COMPLETED;
  }
  if (minutes.some((minute) => (minute.transcripts?.length ?? 0) > 0)) {
    return ProcessingStatus.PROCESSING;
  }
  return ProcessingStatus.PENDING;
}

// 处理状态枚举 (API 层面)
export enum ProcessingStatus {
  PENDING = 'PENDING', // 待处理
  PROCESSING = 'PROCESSING', // 处理中
  COMPLETED = 'COMPLETED', // 已完成
  FAILED = 'FAILED', // 处理失败
  SKIPPED = 'SKIPPED', // 已跳过
}
