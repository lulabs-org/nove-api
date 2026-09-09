import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { OnEvent } from '@nestjs/event-emitter';

import { RedisService } from '@/redis/redis.service';
import {
  IntegrationChangeEvent,
  INTEGRATION_EVENT_PATTERNS,
  IntegrationsService,
} from '@/admin/integrations';
import { SingleOrgContextService } from '@/admin/org';
import { WecomTokenResponse } from '../types/wecom-api.types';

@Injectable()
export class WecomTokenService implements OnModuleInit {
  private readonly logger = new Logger(WecomTokenService.name);
  private memoryToken?: string;
  private memoryTokenExpiresAt = 0;
  private corpId = '';
  private corpSecret = '';
  private redisKey = '';
  private baseUrl = 'https://qyapi.weixin.qq.com';

  constructor(
    private readonly httpService: HttpService,
    private readonly redisService: RedisService,
    private readonly integrationsService: IntegrationsService,
    private readonly orgContext: SingleOrgContextService,
  ) {}

  async onModuleInit() {
    await this.reloadConfig();
  }

  @OnEvent(INTEGRATION_EVENT_PATTERNS.WECOM_UPDATED)
  async handleConfigUpdate(event: IntegrationChangeEvent) {
    if (!this.orgContext.matches(event.orgId)) return;
    this.logger.log('Received config.wecom.updated event, reloading config...');
    await this.clearTokenCache();
    await this.reloadConfig();
  }

  @OnEvent(INTEGRATION_EVENT_PATTERNS.WECOM_DELETED)
  async handleConfigDelete(event: IntegrationChangeEvent) {
    if (!this.orgContext.matches(event.orgId)) return;
    await this.clearTokenCache();
    await this.reloadConfig();
  }

  private async reloadConfig() {
    const { value } = await this.integrationsService.getEffectiveConfig(
      this.orgContext.getOrgId(),
      'wecom',
    );
    this.corpId = String(value.corpId ?? '');
    this.corpSecret = String(value.corpSecret ?? '');
    this.baseUrl = String(value.apiBaseUrl ?? 'https://qyapi.weixin.qq.com');
    this.redisKey = `WECOM_ACCESS_TOKEN:${this.corpId}`;

    if (!this.corpId || !this.corpSecret) {
      this.logger.warn(
        'WeCom configuration missing (corpId or corpSecret), API requests will fail.',
      );
    }
  }

  private async clearTokenCache() {
    this.memoryToken = undefined;
    this.memoryTokenExpiresAt = 0;

    const redisClient = this.redisService.getClient();
    if (this.redisService.isReady() && redisClient && this.redisKey) {
      try {
        await redisClient.del(this.redisKey);
        this.logger.log(`Cleared Redis token cache for ${this.redisKey}`);
      } catch (err) {
        this.logger.warn(
          `Failed to clear Redis token cache: ${(err as Error).message}`,
        );
      }
    }
  }

  async getAccessToken(): Promise<string> {
    const token = await this.getTokenFromCache();
    if (token) return token;

    const { access_token, expires_in } = await this.fetchToken();
    await this.saveTokenToCache(access_token, expires_in ?? 7200);

    return access_token;
  }

  private async getTokenFromCache(): Promise<string | undefined> {
    const redisClient = this.redisService.getClient();

    if (this.redisService.isReady() && redisClient && this.redisKey) {
      try {
        const token = await redisClient.get(this.redisKey);
        if (token) return token;
      } catch (err) {
        this.logger.warn(
          `Failed to get WeCom access token from Redis: ${(err as Error).message}`,
        );
      }
    }

    // Fallback to memory cache
    if (this.memoryToken && Date.now() < this.memoryTokenExpiresAt) {
      return this.memoryToken;
    }

    return undefined;
  }

  private async fetchToken(): Promise<{
    access_token: string;
    expires_in?: number;
  }> {
    if (!this.corpId || !this.corpSecret) {
      throw new ServiceUnavailableException(
        'WECOM_CORP_ID and WECOM_CORP_SECRET must be configured',
      );
    }

    const { data } = await firstValueFrom(
      this.httpService.get<WecomTokenResponse>(
        `${this.baseUrl}/cgi-bin/gettoken`,
        {
          params: {
            corpid: this.corpId,
            corpsecret: this.corpSecret,
          },
        },
      ),
    ).catch((e: AxiosError) => {
      this.logger.error('WeCom Token HTTP error:', e.message);
      throw new ServiceUnavailableException(
        `WeCom API request failed: ${e.response?.status}`,
      );
    });

    if (data.errcode !== 0) {
      throw new ServiceUnavailableException(
        `WeCom token error: ${data.errcode} ${data.errmsg}`,
      );
    }

    if (!data.access_token) {
      throw new ServiceUnavailableException('WeCom access token missing');
    }

    return { access_token: data.access_token, expires_in: data.expires_in };
  }

  private async saveTokenToCache(
    token: string,
    expiresIn: number,
  ): Promise<void> {
    const ttl = Math.max(1, expiresIn - 300); // 提前 5 分钟过期，防止临界点失效

    // Always update memory cache as fallback
    this.memoryToken = token;
    this.memoryTokenExpiresAt = Date.now() + ttl * 1000;

    const redisClient = this.redisService.getClient();
    if (this.redisService.isReady() && redisClient && this.redisKey) {
      try {
        await redisClient.set(this.redisKey, token, 'EX', ttl);
      } catch (err) {
        this.logger.warn(
          `Failed to set WeCom access token to Redis: ${(err as Error).message}`,
        );
      }
    }
  }
}
