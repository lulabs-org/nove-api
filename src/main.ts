/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-06-27 05:18:41
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-08 10:51:26
 * @FilePath: /lulab_backend/src/main.ts
 * @Description:
 *
 * Copyright (c) 2025 by ${git_name_email}, All Rights Reserved.
 */

import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

function parseCsv(value?: string): string[] {
  return (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseRegexCsv(value?: string): RegExp[] {
  return parseCsv(value).map((pattern) => new RegExp(pattern));
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const allowedOrigins = new Set(parseCsv(process.env.CORS_ORIGINS));
  const originRegexes = parseRegexCsv(process.env.CORS_ORIGIN_REGEXES);
  // Required true for cookie/session; can be kept for token-only auth
  const credentials = process.env.CORS_CREDENTIALS === 'true';

  app.enableCors({
    origin: (
      origin: string | undefined,
      cb: (err: Error | null, allow: boolean) => void,
    ) => {
      if (!origin) return cb(null, true);

      if (allowedOrigins.has(origin)) return cb(null, true);
      if (originRegexes.some((re) => re.test(origin))) return cb(null, true);

      return cb(new Error(`CORS blocked: ${origin}`), false);
    },
    credentials,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
  });

  // 启用全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 自动删除非DTO属性
      forbidNonWhitelisted: true, // 当有非白名单属性时抛出错误
      transform: true, // 自动转换类型
    }),
  );

  // Swagger配置
  const config = new DocumentBuilder()
    .setTitle('LuLab Backend API')
    .setDescription('LuLab Backend API文档')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/api`);
  console.log(`📄 Swagger API JSON: http://localhost:${port}/api-json`);
  console.log(`🎯 GraphQL endpoint: http://localhost:${port}/graphql`);
}
bootstrap().catch((error) => {
  console.error('❌ Application failed to start:', error);
  process.exit(1);
});
