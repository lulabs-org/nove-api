/* eslint-disable @typescript-eslint/unbound-method */
import { BadRequestException } from '@nestjs/common';
import { WecomTesterService } from './wecom.tester';
import { IntegrationTesterService } from '@/admin/integrations';

describe('WecomTesterService', () => {
  let testerService: jest.Mocked<IntegrationTesterService>;
  let wecomTester: WecomTesterService;
  const originalFetch = global.fetch;

  beforeEach(() => {
    testerService = {
      registerProvider: jest.fn(),
    } as unknown as jest.Mocked<IntegrationTesterService>;
    wecomTester = new WecomTesterService(testerService);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('registers itself onModuleInit', () => {
    wecomTester.onModuleInit();
    expect(testerService.registerProvider).toHaveBeenCalledWith(
      'wecom',
      wecomTester,
    );
  });

  it('throws BadRequestException when corpId or corpSecret is missing', async () => {
    await expect(
      wecomTester.test({
        corpId: '',
        corpSecret: 'secret',
      }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      wecomTester.test({
        corpId: 'ww123',
        corpSecret: '',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws BadRequestException when encodingAesKey length is not 43', async () => {
    await expect(
      wecomTester.test({
        corpId: 'ww123',
        corpSecret: 'secret',
        encodingAesKey: 'too-short',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('validates credentials successfully when WeCom returns access_token', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        errcode: 0,
        errmsg: 'ok',
        access_token: 'valid_token',
        expires_in: 7200,
      }),
    });

    await expect(
      wecomTester.test({
        corpId: 'ww16632fa26d3f28d5',
        corpSecret: 'test_secret',
        apiBaseUrl: 'https://qyapi.weixin.qq.com',
      }),
    ).resolves.toBeUndefined();

    expect(global.fetch).toHaveBeenCalledWith(
      'https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=ww16632fa26d3f28d5&corpsecret=test_secret',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('throws Error when WeCom returns non-zero errcode', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        errcode: 40013,
        errmsg: 'invalid corpid',
      }),
    });

    await expect(
      wecomTester.test({
        corpId: 'invalid_corp',
        corpSecret: 'test_secret',
      }),
    ).rejects.toThrow('企业微信凭证验证失败');
  });

  it('throws Error when HTTP request fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
    });

    await expect(
      wecomTester.test({
        corpId: 'ww123',
        corpSecret: 'secret',
      }),
    ).rejects.toThrow('企业微信服务器响应异常: HTTP 502');
  });
});
