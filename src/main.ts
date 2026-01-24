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
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { RedocModule, RedocOptions } from 'nestjs-redoc';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

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

  app.use(cookieParser());

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
    .setTitle('Nove API')
    .setDescription('Nove API文档')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Redoc配置
  const redocOptions: RedocOptions = {
    title: 'Nove API',
    logo: {
      url: 'https://redocly.github.io/redoc/petstore-logo.png',
      backgroundColor: '#FFFFFF',
      altText: 'LuLab Logo',
    },
    sortPropsAlphabetically: true,
    hideDownloadButton: false,
    hideHostname: false,
    expandResponses: '200,201',
    requiredPropsFirst: true,
    noAutoAuth: false,
    theme: {
      colors: {
        primary: {
          main: '#6554c0',
        },
      },
      typography: {
        fontFamily: 'muli,sans-serif',
        fontSize: '16px',
        lineHeight: '1.5',
        code: {
          fontFamily: 'monospace',
          color: '#e53935',
          backgroundColor: '#f5f5f5',
        },
      },
      sidebar: {
        width: '300px',
        backgroundColor: '#252b36',
        textColor: '#ffffff',
      },
    },
  };
  await RedocModule.setup('docs', app, document, redocOptions);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/api`);
  console.log(`📄 Swagger API JSON: http://localhost:${port}/api-json`);
  console.log(`📖 Redoc documentation: http://localhost:${port}/docs`);
  console.log(`🎯 GraphQL endpoint: http://localhost:${port}/graphql`);
}
bootstrap().catch((error) => {
  console.error('❌ Application failed to start:', error);
  process.exit(1);
});
