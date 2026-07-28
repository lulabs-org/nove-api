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
import {
  WechatShopOrder,
  WechatShopOrderDetailResponse,
  WechatShopOrderListResponse,
  WechatShopApiResponse,
  GetOrderListParams,
} from '../types/wechat-shop.types';
import { WechatShopTokenService } from './wechat-shop-token.service';

@Injectable()
export class WechatShopClientService {
  private readonly logger = new Logger(WechatShopClientService.name);
  private readonly baseUrl: string;

  constructor(
    @Inject(wechatShopConfig.KEY) private readonly config: WechatShopConfig,
    private readonly httpService: HttpService,
    private readonly wechatShopTokenService: WechatShopTokenService,
  ) {
    this.baseUrl = this.config.apiBaseUrl;
  }

  async getOrderList({
    createTimeRange,
    updateTimeRange,
    pageSize,
    nextKey,
    status,
  }: GetOrderListParams): Promise<WechatShopOrderListResponse> {
    return this.request<WechatShopOrderListResponse>(
      '/channels/ec/order/list/get',
      {
        ...(pageSize !== undefined && { page_size: pageSize }),
        next_key: nextKey ?? '',
        ...(createTimeRange && {
          create_time_range: {
            start_time: createTimeRange.startTime,
            end_time: createTimeRange.endTime,
          },
        }),
        ...(updateTimeRange && {
          update_time_range: {
            start_time: updateTimeRange.startTime,
            end_time: updateTimeRange.endTime,
          },
        }),
        ...(status !== undefined && { status }),
      },
    );
  }

  async getOrder(orderId: string): Promise<WechatShopOrder> {
    const response = await this.request<WechatShopOrderDetailResponse>(
      '/channels/ec/order/get',
      {
        order_id: orderId,
      },
    );

    if (!response.order) {
      throw new ServiceUnavailableException(
        `Wechat order detail missing: orderId=${orderId}`,
      );
    }

    return response.order;
  }

  private async request<T extends WechatShopApiResponse>(
    path: string,
    payload: Record<string, unknown>,
  ): Promise<T> {
    const accessToken = await this.wechatShopTokenService.getAccessToken();
    const { data } = await firstValueFrom(
      this.httpService.post<T>(
        `${this.baseUrl}${path}?access_token=${accessToken}`,
        payload,
      ),
    ).catch((error: AxiosError) => {
      this.logger.error(`Wechat API HTTP error on ${path}:`, error.message);
      throw new ServiceUnavailableException(
        `Wechat API request failed: status=${error.response?.status ?? 'unknown'}`,
      );
    });

    if (data.errcode) {
      throw new ServiceUnavailableException(
        `Wechat API error: ${data.errcode} - ${data.errmsg}`,
      );
    }

    return data;
  }
}
