import { HttpException, HttpStatus } from '@nestjs/common';

// Webhook exceptions
export class WebhookException extends HttpException {
  constructor(message: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super(message, status);
  }
}

export class WebhookSignatureVerificationException extends WebhookException {
  constructor(platform: string) {
    super(`${platform} Webhook签名验证失败`, HttpStatus.UNAUTHORIZED);
  }
}

export class WebhookDecryptionException extends WebhookException {
  constructor(platform: string, error: string) {
    super(`${platform} Webhook数据解密失败: ${error}`, HttpStatus.BAD_REQUEST);
  }
}

export class UnsupportedWebhookEventException extends WebhookException {
  constructor(platform: string, eventType: string) {
    super(
      `${platform} 不支持的Webhook事件类型: ${eventType}`,
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class WebhookDataFormatException extends WebhookException {
  constructor(platform: string, field: string, expected: string) {
    super(
      `${platform} Webhook数据格式错误: ${field}, 期望: ${expected}`,
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class WebhookProcessingTimeoutException extends WebhookException {
  constructor(platform: string, eventType: string, timeout: number) {
    super(
      `${platform} Webhook事件处理超时: ${eventType}, 超时时间: ${timeout}ms`,
      HttpStatus.REQUEST_TIMEOUT,
    );
  }
}

export class WebhookDuplicateProcessingException extends WebhookException {
  constructor(platform: string, eventId: string) {
    super(`${platform} Webhook事件重复处理: ${eventId}`, HttpStatus.CONFLICT);
  }
}

export class WebhookConfigException extends WebhookException {
  constructor(platform: string, configKey: string) {
    super(
      `${platform} Webhook配置缺失: ${configKey}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

export class WebhookUrlVerificationException extends WebhookException {
  constructor(platform: string, error: string) {
    super(`${platform} Webhook URL验证失败: ${error}`, HttpStatus.BAD_REQUEST);
  }
}

// Platform exceptions
export class MeetingException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR,
  ) {
    super(message, status);
  }
}

export class PlatformConfigException extends MeetingException {
  constructor(platform: string, configKey: string) {
    super(
      `平台配置缺失: ${platform}.${configKey}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

export class PlatformApiException extends MeetingException {
  constructor(platform: string, operation: string, error: string) {
    super(
      `${platform} API调用失败 [${operation}]: ${error}`,
      HttpStatus.BAD_GATEWAY,
    );
  }
}
