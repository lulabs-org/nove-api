import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { AxiosResponse } from 'axios';
import { WechatShopClientService } from './wechat-shop-client.service';
import { WechatShopTokenService } from './wechat-shop-token.service';
import {
  SingleOrgContextService,
  SystemConfigService,
} from '@/admin/system-config/services';

describe('WechatShopClientService', () => {
  let service: WechatShopClientService;
  const httpRequest = jest.fn();
  const getAccessToken = jest.fn();
  const getEffectiveConfig = jest.fn();
  const getOrgId = jest.fn();
  const matches = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockHttp = {
      request: httpRequest,
    } as unknown as HttpService;
    getAccessToken.mockResolvedValue('mock_token');
    const mockToken = {
      getAccessToken,
    } as unknown as WechatShopTokenService;
    getEffectiveConfig.mockResolvedValue({
      value: { apiBaseUrl: 'https://api.weixin.qq.com' },
    });
    const mockConfig = {
      getEffectiveConfig,
    } as unknown as SystemConfigService;
    getOrgId.mockReturnValue('org-1');
    matches.mockReturnValue(true);
    const mockOrg = {
      getOrgId,
      matches,
    } as unknown as SingleOrgContextService;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WechatShopClientService,
        { provide: HttpService, useValue: mockHttp },
        { provide: WechatShopTokenService, useValue: mockToken },
        { provide: SystemConfigService, useValue: mockConfig },
        { provide: SingleOrgContextService, useValue: mockOrg },
      ],
    }).compile();

    service = module.get<WechatShopClientService>(WechatShopClientService);
  });

  describe('getAftersaleList', () => {
    it('calls /channels/ec/aftersale/getaftersalelist with access_token and params', async () => {
      const mockResponse: AxiosResponse = {
        data: {
          errcode: 0,
          errmsg: 'ok',
          after_sale_order_id_list: ['aftersale-1', 'aftersale-2'],
          has_more: false,
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { headers: {} as never },
      };

      httpRequest.mockReturnValue(of(mockResponse));

      const params = {
        begin_create_time: 1700000000,
        end_create_time: 1700086400,
      };

      const result = await service.getAftersaleList(params);

      expect(getAccessToken).toHaveBeenCalled();
      expect(httpRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://api.weixin.qq.com/channels/ec/aftersale/getaftersalelist',
          method: 'POST',
          params: { access_token: 'mock_token' },
          data: params,
        }),
      );
      expect(result).toEqual(mockResponse.data);
    });
  });
});
