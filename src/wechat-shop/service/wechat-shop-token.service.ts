import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  Inject,
} from '@nestjs/common';
import { wechatShopConfig, WechatShopConfig } from '@/configs';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { RedisService } from '@/redis/redis.service';
import { WechatShopApiResponse } from '../types/wechat-shop.types';

@Injectable()
export class WechatShopTokenService {
  private readonly logger = new Logger(WechatShopTokenService.name);
  private memoryToken?: string;
  private memoryTokenExpiresAt = 0;
  private readonly appId: string;
  private readonly appSecret: string;
  private readonly redisKey: string;
  private readonly baseUrl: string;

  constructor(
    @Inject(wechatShopConfig.KEY) private readonly config: WechatShopConfig,
    private readonly httpService: HttpService,
    private readonly redisService: RedisService,
  ) {
    const { appId, appSecret, apiBaseUrl } = this.config;

    if (!appId || !appSecret) {
      throw new Error(
        'WECHAT_SHOP_APP_ID and WECHAT_SHOP_APP_SECRET must be configured',
      );
    }

    this.appId = appId;
    this.appSecret = appSecret;
    this.redisKey = `WECHAT_SHOP_ACCESS_TOKEN:${appId}`;
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
          `Failed to get access token from Redis: ${(err as Error).message}`,
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
      this.httpService.post<
        WechatShopApiResponse & { access_token?: string; expires_in?: number }
      >(`${this.baseUrl}/cgi-bin/stable_token`, {
        grant_type: 'client_credential',
        appid: this.appId,
        secret: this.appSecret,
        force_refresh: false,
      }),
    ).catch((e: AxiosError) => {
      this.logger.error('Wechat Token HTTP error:', e.message);
      throw new ServiceUnavailableException(
        `Wechat API request failed: ${e.response?.status}`,
      );
    });

    if (data.errcode) {
      throw new ServiceUnavailableException(
        `Wechat token error: ${data.errcode} ${data.errmsg}`,
      );
    }

    if (!data.access_token) {
      throw new ServiceUnavailableException('Wechat access token missing');
    }

    return { access_token: data.access_token, expires_in: data.expires_in };
  }

  private async saveTokenToCache(
    token: string,
    expiresIn: number,
  ): Promise<void> {
    const ttl = Math.max(1, expiresIn - 300); // 提前 5 分钟过期

    // Always update memory cache as fallback
    this.memoryToken = token;
    this.memoryTokenExpiresAt = Date.now() + ttl * 1000;

    const redisClient = this.redisService.getClient();
    if (this.redisService.isReady() && redisClient) {
      try {
        await redisClient.set(this.redisKey, token, 'EX', ttl);
      } catch (err) {
        this.logger.warn(
          `Failed to set access token to Redis: ${(err as Error).message}`,
        );
      }
    }
  }
}
