/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-09-04 19:31:58
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-09-12 19:38:36
 * @FilePath: /lulab_backend/test/setup-integration.ts
 * @Description:
 *
 * Copyright (c) 2025 by ${git_name_email}, All Rights Reserved.
 */

import { config } from 'dotenv';
import { existsSync } from 'fs';

// 优先加载 .env.test，若不存在则回退加载 .env
if (existsSync('.env.test')) {
  config({ path: '.env.test' });
} else if (existsSync('.env')) {
  config({ path: '.env' });
}

// 设置更长的超时时间用于集成测试
jest.setTimeout(60000);

// 全局测试配置
console.log('🔧 Integration test setup complete');
