import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  WechatShopOrder,
  WechatShopOrderDetailResponse,
  WechatShopOrderListResponse,
  WechatShopApiResponse,
} from '../types/wechat-shop.types';

const DEFAULT_WECHAT_API_BASE_URL = 'https://api.weixin.qq.com';
const TOKEN_REFRESH_SKEW_MS = 5 * 60 * 1000;

@Injectable()
export class WechatShopService {
  private cachedAccessToken?: string;
  private cachedAccessTokenExpiresAt = 0;

  async getOrderIds(params: {
    startTime: number;
    endTime: number;
    timeType: 'create' | 'update';
    pageSize: number;
    nextKey?: string;
    status?: number;
  }): Promise<WechatShopOrderListResponse> {
    const payload: Record<string, unknown> = {
      page_size: params.pageSize,
      next_key: params.nextKey ?? '',
    };

    const timeRange = {
      start_time: params.startTime,
      end_time: params.endTime,
    };

    if (params.timeType === 'update') {
      payload.update_time_range = timeRange;
    } else {
      payload.create_time_range = timeRange;
    }

    if (params.status !== undefined) {
      payload.status = params.status;
    }

    return this.postWechatApi<WechatShopOrderListResponse>(
      '/channels/ec/order/list/get',
      payload,
    );
  }

  async getOrder(orderId: string): Promise<WechatShopOrder> {
    const response = await this.postWechatApi<WechatShopOrderDetailResponse>(
      '/channels/ec/order/get',
      { order_id: orderId },
    );

    if (!response.order) {
      throw new ServiceUnavailableException(
        `Wechat order detail missing: orderId=${orderId}`,
      );
    }

    return response.order;
  }

  private async postWechatApi<T extends WechatShopApiResponse>(
    path: string,
    payload: Record<string, unknown>,
  ): Promise<T> {
    const accessToken = await this.getAccessToken();
    const url = new URL(path, this.getBaseUrl());
    url.searchParams.set('access_token', accessToken);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new ServiceUnavailableException(
        `Wechat API request failed: status=${response.status}`,
      );
    }

    const data = (await response.json()) as T;
    if (data.errcode && data.errcode !== 0) {
      throw new ServiceUnavailableException(
        `Wechat API error: errcode=${data.errcode}, errmsg=${data.errmsg ?? ''}`,
      );
    }

    return data;
  }

  private async getAccessToken(): Promise<string> {
    if (
      this.cachedAccessToken &&
      Date.now() < this.cachedAccessTokenExpiresAt - TOKEN_REFRESH_SKEW_MS
    ) {
      return this.cachedAccessToken;
    }

    const appId = process.env.WECHAT_SHOP_APP_ID;
    const appSecret = process.env.WECHAT_SHOP_APP_SECRET;
    if (!appId || !appSecret) {
      throw new ServiceUnavailableException(
        'Wechat shop credentials are missing: set WECHAT_SHOP_APP_ID and WECHAT_SHOP_APP_SECRET',
      );
    }

    const url = new URL('/cgi-bin/token', this.getBaseUrl());
    url.searchParams.set('appid', appId);
    url.searchParams.set('secret', appSecret);
    url.searchParams.set('grant_type', 'client_credential');

    const response = await fetch(url);
    if (!response.ok) {
      throw new ServiceUnavailableException(
        `Wechat access token request failed: status=${response.status}`,
      );
    }

    const data = (await response.json()) as WechatShopApiResponse & {
      access_token?: string;
      expires_in?: number;
    };

    if (data.errcode && data.errcode !== 0) {
      throw new ServiceUnavailableException(
        `Wechat access token error: errcode=${data.errcode}, errmsg=${data.errmsg ?? ''}`,
      );
    }

    if (!data.access_token) {
      throw new ServiceUnavailableException('Wechat access token missing');
    }

    this.cachedAccessToken = data.access_token;
    this.cachedAccessTokenExpiresAt =
      Date.now() + (data.expires_in ?? 7200) * 1000;

    return data.access_token;
  }

  private getBaseUrl(): string {
    return process.env.WECHAT_SHOP_API_BASE_URL ?? DEFAULT_WECHAT_API_BASE_URL;
  }
}
