/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-06-27 05:18:41
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-24 08:31:48
 * @FilePath: /nove_api/src/main.ts
 * @Description:
 *
 * Copyright (c) 2025 by ${git_name_email}, All Rights Reserved.
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import {
  appConfig,
  getCorsConfig,
  setupSwagger,
  validationPipeOptions,
} from './configs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // 跨域与 Cookie 中间件
  app.enableCors(getCorsConfig());
  app.use(cookieParser());

  // 启用全局验证管道
  app.useGlobalPipes(new ValidationPipe(validationPipeOptions));

  // 配置 Swagger & Redoc 文档服务
  await setupSwagger(app);

  await app.listen(appConfig.port);
  console.log(
    `🚀 Application is running on: http://localhost:${appConfig.port}`,
  );
  console.log(
    `📚 Swagger documentation: http://localhost:${appConfig.port}/api`,
  );
  console.log(
    `📄 Swagger API JSON: http://localhost:${appConfig.port}/api-json`,
  );
  console.log(
    `📖 Redoc documentation: http://localhost:${appConfig.port}/docs`,
  );
  console.log(
    `🎯 GraphQL endpoint: http://localhost:${appConfig.port}/graphql`,
  );
}
bootstrap().catch((error) => {
  console.error('❌ Application failed to start:', error);
  process.exit(1);
});
