import { HttpService } from '@nestjs/axios';
import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

import { wecomConfig, WecomConfig } from '@/configs/wecom.config';
import { RedisService } from '@/redis/redis.service';
import { WecomTokenResponse } from '../types/wecom-api.types';

@Injectable()
export class WecomTokenService {
  private readonly logger = new Logger(WecomTokenService.name);
  private memoryToken?: string;
  private memoryTokenExpiresAt = 0;
  private readonly corpId: string;
  private readonly corpSecret: string;
  private readonly redisKey: string;
  private readonly baseUrl: string;

  constructor(
    @Inject(wecomConfig.KEY) private readonly config: WecomConfig,
    private readonly httpService: HttpService,
    private readonly redisService: RedisService,
  ) {
    const { corpId, corpSecret, apiBaseUrl } = this.config;

    if (!corpId || !corpSecret) {
      throw new Error('WECOM_CORP_ID and WECOM_CORP_SECRET must be configured');
    }

    this.corpId = corpId;
    this.corpSecret = corpSecret;
    this.redisKey = `WECOM_ACCESS_TOKEN:${corpId}`;
    this.baseUrl = apiBaseUrl;
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

    if (this.redisService.isReady() && redisClient) {
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
    if (this.redisService.isReady() && redisClient) {
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
