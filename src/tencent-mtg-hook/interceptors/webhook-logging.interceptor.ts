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
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';

/**
 * Webhook logging interceptor
 * Records detailed information for all Webhook requests, including headers, body, response time, etc.
 */
@Injectable()
export class WebhookLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(WebhookLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context
      .switchToHttp()
      .getRequest<Request<any, any, unknown, any>>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();

    // Extract key information (avoid unsafe destructuring of potential any types)
    const method = request.method;
    const url = request.url;
    const headers = request.headers as Record<string, unknown>;
    const body = request.body;
    const query = request.query as Record<string, unknown>;
    const ip = request.ip;

    // Log request start
    this.logger.log(`Webhook request started: ${method} ${url}`, {
      ip,
      userAgent: headers['user-agent'],
      contentType: headers['content-type'],
      contentLength: headers['content-length'],
      query: Object.keys(query).length > 0 ? query : undefined,
      timestamp: new Date().toISOString(),
    });

    // Log important headers (filter sensitive information)
    const importantHeaders = this.filterHeaders(headers);
    if (Object.keys(importantHeaders).length > 0) {
      this.logger.debug('Important headers:', importantHeaders);
    }

    // Log request body (if not too large)
    if (body && this.shouldLogBody(body, headers)) {
      this.logger.debug('Request body:', {
        bodyType: typeof body,
        bodySize: JSON.stringify(body).length,
        body: this.sanitizeBody(body),
      });
    }

    return next.handle().pipe(
      tap((data) => {
        const duration = Date.now() - startTime;

        this.logger.log(
          `Webhook request succeeded: ${method} ${url} - ${response.statusCode} - ${duration}ms`,
          {
            statusCode: response.statusCode,
            duration,
            responseType: typeof data,
            responseSize: data ? JSON.stringify(data).length : 0,
            timestamp: new Date().toISOString(),
          },
        );

        // Log response data (if exists and not too large)
        if (data && this.shouldLogResponse(data)) {
          this.logger.debug('Response data:', {
            data: this.sanitizeResponse(data),
          });
        }
      }),
      catchError((error: unknown) => {
        const duration = Date.now() - startTime;

        const err = error as {
          message?: string;
          stack?: string;
          status?: number;
        };
        this.logger.error(
          `Webhook request failed: ${method} ${url} - ${duration}ms`,
          {
            error: err?.message,
            stack: err?.stack,
            statusCode: err?.status ?? 500,
            duration,
            timestamp: new Date().toISOString(),
          },
        );

        throw error;
      }),
    );
  }

  /**
   * Filter request headers, keeping only important non-sensitive information
   */
  private filterHeaders(
    headers: Record<string, unknown>,
  ): Record<string, unknown> {
    const importantHeaders: Record<string, unknown> = {};

    // Important headers to log
    const headersToLog = [
      'wechatwork-signature',
      'wechatwork-timestamp',
      'wechatwork-nonce',
      'x-zoom-webhook-signature',
      'x-zoom-webhook-timestamp',
      'x-teams-signature',
      'x-feishu-signature',
      'content-type',
      'content-length',
      'user-agent',
      'x-forwarded-for',
      'x-real-ip',
    ];

    for (const key of headersToLog) {
      const lowerKey = key.toLowerCase();
      const value = headers[key] || headers[lowerKey];
      if (value) {
        // Partially mask signatures
        if (key.includes('signature')) {
          if (typeof value === 'string') {
            importantHeaders[key] = this.maskSignature(value);
          }
        } else {
          importantHeaders[key] = value;
        }
      }
    }

    return importantHeaders;
  }

  /**
   * Determine whether to log request body
   */
  private shouldLogBody(
    body: unknown,
    headers: Record<string, unknown>,
  ): boolean {
    // Don't log too large request body
    const bodySize = JSON.stringify(body).length;
    if (bodySize > 10000) {
      // 10KB limit
      return false;
    }

    // Don't log binary content
    const ctRaw = headers['content-type'];
    const contentType = typeof ctRaw === 'string' ? ctRaw : '';
    if (
      contentType.includes('multipart/form-data') ||
      contentType.includes('application/octet-stream')
    ) {
      return false;
    }

    return true;
  }

  /**
   * Determine whether to log response data
   */
  private shouldLogResponse(data: unknown): boolean {
    if (!data) return false;

    const dataSize = JSON.stringify(data).length;
    return dataSize <= 5000; // 5KB limit
  }

  /**
   * Clean sensitive information from request body
   */
  private sanitizeBody(body: unknown): unknown {
    if (typeof body !== 'object' || body === null) {
      return body;
    }

    const sanitized: Record<string, unknown> = {
      ...(body as Record<string, unknown>),
    };

    // Remove or mask sensitive fields
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'authorization',
      'credential',
    ];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '***MASKED***';
      }
    }

    // Recursively process nested objects
    for (const key in sanitized) {
      const val = sanitized[key];
      if (typeof val === 'object' && val !== null) {
        sanitized[key] = this.sanitizeBody(val);
      }
    }

    return sanitized;
  }

  /**
   * Clean sensitive information from response data
   */
  private sanitizeResponse(data: unknown): unknown {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sanitized: Record<string, unknown> = {
      ...(data as Record<string, unknown>),
    };

    // Remove or mask sensitive fields
    const sensitiveFields = [
      'token',
      'secret',
      'key',
      'credential',
      'internalId',
    ];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '***MASKED***';
      }
    }

    return sanitized;
  }

  /**
   * Mask signature information (only show first and last few characters)
   */
  private maskSignature(signature: string): string {
    if (!signature || signature.length < 10) {
      return '***MASKED***';
    }

    const start = signature.substring(0, 4);
    const end = signature.substring(signature.length - 4);
    return `${start}***${end}`;
  }
}
