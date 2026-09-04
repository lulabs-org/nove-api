/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-10-02 21:14:03
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-10-05 00:01:29
 * @FilePath: /lulab_backend/src/configs/lark.config.spec.ts
 * @Description:
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import { larkConfig } from './lark.config';

describe('larkConfig', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('maps environment variables to config fields', () => {
    process.env.LARK_APP_ID = 'app_id_123';
    process.env.LARK_APP_SECRET = 'secret_456';
    process.env.LARK_LOG_LEVEL = 'debug';
    process.env.LARK_BASE_URL = 'https://example.larksuite.com';
    process.env.LARK_EVENT_ENCRYPT_KEY = 'encrypt_key_789';
    process.env.LARK_EVENT_VERIFICATION_TOKEN = 'verification_token_012';

    const cfg = larkConfig();

    expect(cfg.appId).toBe('app_id_123');
    expect(cfg.appSecret).toBe('secret_456');
    expect(cfg.logLevel).toBe('debug');
    expect(cfg.baseUrl).toBe('https://example.larksuite.com');

    expect(cfg.event.encryptKey).toBe('encrypt_key_789');
    expect(cfg.event.verificationToken).toBe('verification_token_012');
  });

  it('applies sensible defaults when env vars are missing', () => {
    delete process.env.LARK_APP_ID;
    delete process.env.LARK_APP_SECRET;
    delete process.env.LARK_LOG_LEVEL;
    delete process.env.LARK_BASE_URL;
    delete process.env.LARK_EVENT_ENCRYPT_KEY;
    delete process.env.LARK_EVENT_VERIFICATION_TOKEN;

    const cfg = larkConfig();

    expect(cfg.appId).toBe('');
    expect(cfg.appSecret).toBe('');
    expect(cfg.logLevel).toBe('info');
    expect(cfg.baseUrl).toBe('https://open.larksuite.com');

    expect(cfg.event.encryptKey).toBe('');
    expect(cfg.event.verificationToken).toBe('');
  });
});
