import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiKeyService } from '../services/api-key.service';

/**
 * API Key 认证守卫
 * 从请求头中提取 API Key 并验证
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // 提取 API Key
    const rawKey = this.extractKey(request);
    if (!rawKey) {
      throw new UnauthorizedException('API key required');
    }

    try {
      // 验证 API Key
      const authContext = await this.apiKeyService.verifyKey(rawKey);

      // 将认证上下文附加到请求对象
      request.apiAuth = authContext;

      return true;
    } catch {
      // 统一返回通用错误消息，防止信息泄露
      throw new UnauthorizedException('Invalid API key');
    }
  }

  /**
   * 从请求头中提取 API Key
   * 支持两种方式：
   * 1. Authorization: Bearer <key>
   * 2. x-api-key: <key>
   */
  private extractKey(request: Request): string | null {
    // 尝试从 Authorization header 提取
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // 尝试从 x-api-key header 提取
    const apiKeyHeader = request.headers['x-api-key'];
    if (apiKeyHeader) {
      return Array.isArray(apiKeyHeader) ? apiKeyHeader[0] : apiKeyHeader;
    }

    return null;
  }
}
