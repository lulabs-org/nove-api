import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * 会议相关异常基类
 */
export class MeetingException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
  ) {
    super(message, status);
  }
}

/**
 * 会议记录未找到异常
 */
export class MeetingRecordNotFoundException extends MeetingException {
  constructor(meetingId?: string) {
    const message = meetingId
      ? `会议记录未找到: ${meetingId}`
      : '会议记录未找到';
    super(message, HttpStatus.NOT_FOUND);
  }
}

/**
 * 会议记录已存在异常
 */
export class MeetingRecordAlreadyExistsException extends MeetingException {
  constructor(platformMeetingId: string, subMeetingId: string) {
    super(
      `会议记录已存在: 会议ID=${platformMeetingId}, 子会议ID=${subMeetingId}`,
      HttpStatus.CONFLICT,
    );
  }
}

/**
 * 文件下载异常
 */
export class FileDownloadException extends MeetingException {
  constructor(url: string, error: string) {
    super(`文件下载失败 [${url}]: ${error}`, HttpStatus.BAD_GATEWAY);
  }
}

/**
 * 参数验证异常
 */
export class MeetingValidationException extends MeetingException {
  constructor(field: string, value: any, requirement: string) {
    super(
      `参数验证失败: ${field}=${value}, 要求: ${requirement}`,
      HttpStatus.BAD_REQUEST,
    );
  }
}

/**
 * 会议状态异常
 */
export class MeetingStatusException extends MeetingException {
  constructor(
    meetingId: string,
    currentStatus: string,
    requiredStatus: string,
  ) {
    super(
      `会议状态不符合要求: ${meetingId}, 当前状态: ${currentStatus}, 要求状态: ${requiredStatus}`,
      HttpStatus.CONFLICT,
    );
  }
}

/**
 * 录制记录未找到异常
 */
export class RecordingNotFoundException extends MeetingException {
  constructor(recordingId: string) {
    super(`录制记录不存在: ${recordingId}`, HttpStatus.NOT_FOUND);
  }
}

/**
 * 会议总结未找到异常
 */
export class MeetingSummaryNotFoundException extends MeetingException {
  constructor(meetingId: string) {
    super(`会议总结不存在: ${meetingId}`, HttpStatus.NOT_FOUND);
  }
}
