/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-02-15 21:10:16
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-19 03:11:55
 * @FilePath: /nove_api/src/api-key/interceptors/usage-logging.interceptor.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';
import { UsageLogService } from '../services/usage-log.service';

/**
 * Usage Logging Interceptor
 * 拦截所有使用 API Key 认证的请求，记录使用日志
 */
@Injectable()
export class UsageLoggingInterceptor implements NestInterceptor {
  constructor(private readonly usageLogService: UsageLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // 记录请求开始时间
    const startTime = Date.now();

    // 获取 API Key 认证上下文
    const apiAuth = request.apiAuth;

    // 如果没有 API Key 认证上下文，跳过日志记录
    if (!apiAuth) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        const latencyMs = Date.now() - startTime;
        void this.usageLogService.logRequest(
          apiAuth.apiKeyId,
          apiAuth.orgId,
          request,
          response,
          latencyMs,
        );
      }),
      catchError((error: Error) => {
        const latencyMs = Date.now() - startTime;
        void this.usageLogService.logRequest(
          apiAuth.apiKeyId,
          apiAuth.orgId,
          request,
          response,
          latencyMs,
          error?.message ?? 'Unknown error',
        );
        return throwError(() => error);
      }),
    );
  }
}
