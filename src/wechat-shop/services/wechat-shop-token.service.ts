import { HttpService } from '@nestjs/axios';
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  OnModuleInit,
} from '@nestjs/common';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { OnEvent } from '@nestjs/event-emitter';
import { RedisService } from '@/redis/redis.service';
import { WechatShopApiResponse } from '../types';
import { SystemConfigService } from '@/admin/system-config/services/system-config.service';

@Injectable()
export class WechatShopTokenService implements OnModuleInit {
  private readonly logger = new Logger(WechatShopTokenService.name);
  private memoryToken?: string;
  private memoryTokenExpiresAt = 0;
  private appId: string;
  private appSecret: string;
  private redisKey: string;
  private baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly redisService: RedisService,
    private readonly systemConfigService: SystemConfigService,
  ) {
    this.appId = '';
    this.appSecret = '';
    this.baseUrl = 'https://api.weixin.qq.com';
    this.redisKey = `WECHAT_SHOP_ACCESS_TOKEN:${this.appId}`;
  }

  async onModuleInit() {
    await this.reloadConfig();
  }

  @OnEvent('config.wechat-shop.updated')
  async handleConfigUpdate() {
    this.logger.log(
      'Received config.wechat-shop.updated event, reloading config...',
    );
    // Clear old token cache
    await this.clearTokenCache();
    // Reload config
    await this.reloadConfig();
  }

  @OnEvent('config.wechat-shop.deleted')
  async handleConfigDelete() {
    await this.clearTokenCache();
    await this.reloadConfig();
  }

  private async reloadConfig() {
    const { value } =
      await this.systemConfigService.getEffectiveConfig('wechat-shop');
    this.appId = String(value.appId ?? '');
    this.appSecret = String(value.appSecret ?? '');
    this.baseUrl = String(value.apiBaseUrl ?? 'https://api.weixin.qq.com');
    this.redisKey = `WECHAT_SHOP_ACCESS_TOKEN:${this.appId}`;

    if (!this.appId || !this.appSecret) {
      this.logger.warn(
        'WeChat Shop configuration missing (appId or appSecret), API requests will fail.',
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
    if (!this.appId || !this.appSecret) {
      throw new ServiceUnavailableException(
        'WECHAT_SHOP_APP_ID and WECHAT_SHOP_APP_SECRET must be configured',
      );
    }

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
