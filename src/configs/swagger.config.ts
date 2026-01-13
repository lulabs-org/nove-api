/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-14 01:08:16
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-14 01:22:46
 * @FilePath: /nove_api/src/configs/swagger.config.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { DocumentBuilder } from '@nestjs/swagger';

export const swaggerConfig = new DocumentBuilder()
  .setTitle('Nove API')
  .setDescription('Nove API文档')
  .setVersion('1.0')
  .addServer('http://localhost:3000', 'Local')
  .addServer('https://admin.lulabs.cn', 'Production')
  .addBearerAuth()
  .addApiKey()
  // .addOAuth2({
  //   type: 'oauth2',
  //   flows: {
  //     password: {
  //       tokenUrl: '/auth/token',
  //       scopes: {
  //         read: '读取权限',
  //         write: '写入权限',
  //       },
  //     },
  //   },
  // })
  .build();
