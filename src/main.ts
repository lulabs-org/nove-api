/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-06-27 05:18:41
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-07 10:06:11
 * @FilePath: /lulab_backend/src/main.ts
 * @Description:
 *
 * Copyright (c) 2025 by ${git_name_email}, All Rights Reserved.
 */

import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
    : [];

  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
    // credentials: true, // 如果你用 cookie/session 必须 true；纯 token 也可以留着
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
