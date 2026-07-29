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
  OrderListResponse,
  OrderDetailResponse,
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

  /**
   * 获取订单列表
   * 
   * @see https://developers.weixin.qq.com/doc/store/shop/API/channels-shop-order/api_getorderlist.html
   * @param params 请求参数。注意：createTimeRange 和 updateTimeRange 至少需要传入一个，且每次请求时间跨度不可超过 7 天
   * @returns 微信订单列表及分页游标
   */
  async getOrderList({
    createTimeRange,
    updateTimeRange,
    pageSize,
    nextKey,
    status,
    openid,
  }: GetOrderListParams): Promise<OrderListResponse> {
    return this.request<OrderListResponse>(
      '/channels/ec/order/list/get',
      {
        data: {
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
          ...(openid && { openid }),
        }
      },
    );
  }

  /**
   * 获取订单详情
   * 
   * @see https://developers.weixin.qq.com/doc/store/shop/API/channels-shop-order/api_getorder.html
   * @param orderId 订单 ID，可通过 获取订单列表 接口获取
   * @returns 微信订单详细数据信息
   * @throws ServiceUnavailableException 当接口响应报错或无订单信息返回时
   */
  async getOrder(orderId: string): Promise<OrderDetailResponse> {
    const response = await this.request<OrderDetailResponse>(
      '/channels/ec/order/get',
      {
        data: {
          order_id: String(orderId),
        },
      },
    );

    if (!response?.order) {
      this.logger.error(`Wechat order detail missing: orderId=${orderId}`, response);
      throw new ServiceUnavailableException(
        `Wechat order detail missing: orderId=${orderId}`,
      );
    }

    return response;
  }

  /**
   * 通用微信小店 API 请求封装
   * 
   * 默认注入 access_token 并使用 POST 方式
   */
  private async request<T>(
    path: string,
    options?: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      data?: Record<string, unknown>;
      params?: Record<string, unknown>;
      headers?: Record<string, string>;
      /** 是否跳过自动注入 access_token (部分特殊接口如获取 token 可能会用到) */
      skipToken?: boolean;
    }
  ): Promise<T> {
    const { method = 'POST', data, params = {}, headers, skipToken } = options ?? {};

    const mergedParams = { ...params };
    if (!skipToken) {
      mergedParams['access_token'] = await this.wechatShopTokenService.getAccessToken();
    }

    const { data: responseData } = await firstValueFrom(
      this.httpService.request<T & WechatShopApiResponse>({
        url: `${this.baseUrl}${path}`,
        method,
        data,
        params: mergedParams,
        headers,
      }),
    ).catch((error: AxiosError) => {
      this.logger.error(`Wechat API HTTP error on ${method} ${path}:`, {
        message: error.message,
        response: error.response?.data,
      });
      throw new ServiceUnavailableException(
        `Wechat API request failed: status=${error.response?.status ?? 'unknown'}`,
      );
    });

    // errcode 为非 0 时抛出异常
    if (responseData.errcode) {
      throw new ServiceUnavailableException(
        `Wechat API error: ${responseData.errcode} - ${responseData.errmsg}`,
      );
    }

    return responseData as T;
  }
}
