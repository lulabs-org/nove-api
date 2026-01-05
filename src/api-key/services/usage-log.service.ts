import { Injectable, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { UsageLogRepository } from '../repositories/usage-log.repository';

/**
 * Usage Log Service
 * 处理 API Key 使用日志的业务逻辑
 */
@Injectable()
export class UsageLogService {
  private readonly logger = new Logger(UsageLogService.name);

  constructor(private readonly usageLogRepository: UsageLogRepository) {}

  /**
   * 记录 API 请求
   * @param apiKeyId API Key ID
   * @param organizationId 组织 ID
   * @param request Express Request 对象
   * @param response Express Response 对象
   * @param latencyMs 请求延迟（毫秒）
   * @param error 错误信息（可选）
   */
  async logRequest(
    apiKeyId: string,
    organizationId: string,
    request: Request,
    response: Response,
    latencyMs: number,
    error?: string,
  ): Promise<void> {
    try {
      await this.usageLogRepository.create({
        apiKey: {
          connect: { id: apiKeyId },
        },
        organization: {
          connect: { id: organizationId },
        },
        method: request.method,
        path: request.path,
        statusCode: response.statusCode,
        latencyMs: Math.round(latencyMs),
        ip: this.extractIp(request),
        userAgent: request.headers['user-agent'] || null,
        error: error || null,
      });
    } catch (err) {
      // 日志记录失败不应影响主流程
      this.logger.error('Failed to log API key usage', err);
    }
  }

  /**
   * 记录认证失败
   * @param request Express Request 对象
   * @param error 错误信息
   */
  logAuthFailure(request: Request, error: string): void {
    try {
      // 对于认证失败，我们没有 apiKeyId 和 organizationId
      // 可以记录到单独的表或使用特殊标记
      this.logger.warn('API key authentication failed', {
        method: request.method,
        path: request.path,
        ip: this.extractIp(request),
        userAgent: request.headers['user-agent'],
        error,
      });
    } catch (err) {
      this.logger.error('Failed to log auth failure', err);
    }
  }

  /**
   * 提取客户端 IP 地址
   * 考虑代理和负载均衡器
   */
  private extractIp(request: Request): string | null {
    // 尝试从 X-Forwarded-For 获取真实 IP
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
      return ips.split(',')[0].trim();
    }

    // 尝试从 X-Real-IP 获取
    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    // 使用连接的远程地址
    return request.ip || request.socket.remoteAddress || null;
  }
}
