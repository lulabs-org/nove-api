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
        // 请求成功，记录日志
        const latencyMs = Date.now() - startTime;
        void this.usageLogService.logRequest(
          apiAuth.apiKeyId,
          apiAuth.organizationId,
          request,
          response,
          latencyMs,
        );
      }),
      catchError((error: Error) => {
        // 请求失败，记录错误日志
        const latencyMs = Date.now() - startTime;
        void this.usageLogService.logRequest(
          apiAuth.apiKeyId,
          apiAuth.organizationId,
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
