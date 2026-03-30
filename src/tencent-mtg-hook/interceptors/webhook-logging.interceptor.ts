/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-10-01 01:08:34
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-08 23:39:40
 * @FilePath: /nove_api/src/tencent-mtg-hook/interceptors/webhook-logging.interceptor.ts
 * @Description: Tencent Meeting Webhook logging interceptor that records detailed information for all Webhook requests
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import type { Request, Response } from 'express';

/**
 * Tencent Meeting webhook logging interceptor
 * Keeps request logs focused on Tencent-specific debugging information.
 */
@Injectable()
export class WebhookLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(WebhookLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();
    const method = request.method;
    const url = request.url;

    this.logger.log(`Tencent webhook request started: ${method} ${url}`, {
      ip: request.ip,
      userAgent: this.getHeaderValue(request.headers, 'user-agent'),
      contentLength: this.getHeaderValue(request.headers, 'content-length'),
      timestamp: this.getHeaderValue(request.headers, 'timestamp'),
      nonce: this.getHeaderValue(request.headers, 'nonce'),
      signature: this.maskSignature(
        this.getHeaderValue(request.headers, 'signature'),
      ),
      encryptedDataLength: this.getEncryptedDataLength(request.body),
      checkStrPresent: this.hasCheckStr(request.query),
    });

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;

        this.logger.log(
          `Tencent webhook request completed: ${method} ${url} - ${response.statusCode} - ${duration}ms`,
          {
            statusCode: response.statusCode,
            duration,
            timestamp: this.getHeaderValue(request.headers, 'timestamp'),
            nonce: this.getHeaderValue(request.headers, 'nonce'),
            signature: this.maskSignature(
              this.getHeaderValue(request.headers, 'signature'),
            ),
          },
        );
      }),
      catchError((error: unknown) => {
        const duration = Date.now() - startTime;
        const err = this.normalizeError(error);
        this.logger.error(
          `Tencent webhook request failed: ${method} ${url} - ${duration}ms`,
          {
            error: err.message,
            stack: err.stack,
            statusCode: err.statusCode,
            duration,
            timestamp: this.getHeaderValue(request.headers, 'timestamp'),
            nonce: this.getHeaderValue(request.headers, 'nonce'),
            signature: this.maskSignature(
              this.getHeaderValue(request.headers, 'signature'),
            ),
          },
        );

        return throwError(() => error);
      }),
    );
  }

  private getHeaderValue(
    headers: Request['headers'],
    key: string,
  ): string | undefined {
    const value = headers[key];
    if (Array.isArray(value)) {
      return value[0];
    }

    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }

  private getEncryptedDataLength(body: unknown): number | undefined {
    if (typeof body !== 'object' || body === null) {
      return undefined;
    }

    const data = (body as Record<string, unknown>).data;
    return typeof data === 'string' ? data.length : undefined;
  }

  private hasCheckStr(query: unknown): boolean | undefined {
    if (typeof query !== 'object' || query === null) {
      return undefined;
    }

    const checkStr = (query as Record<string, unknown>).check_str;
    if (Array.isArray(checkStr)) {
      return checkStr.length > 0;
    }

    return typeof checkStr === 'string' ? checkStr.length > 0 : undefined;
  }

  private normalizeError(error: unknown): {
    message: string;
    stack?: string;
    statusCode: number;
  } {
    if (error instanceof Error) {
      const status = (error as Error & { status?: number }).status;
      return {
        message: error.message,
        stack: error.stack,
        statusCode: typeof status === 'number' ? status : 500,
      };
    }

    return {
      message: typeof error === 'string' ? error : 'Unknown error',
      statusCode: 500,
    };
  }

  /**
   * Mask signature information (only show first and last few characters)
   */
  private maskSignature(signature?: string): string | undefined {
    if (!signature) {
      return undefined;
    }

    if (signature.length < 10) {
      return '***MASKED***';
    }

    const start = signature.substring(0, 4);
    const end = signature.substring(signature.length - 4);
    return `${start}***${end}`;
  }
}
