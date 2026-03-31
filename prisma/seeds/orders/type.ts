/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-12 03:58:14
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-12 03:59:04
 * @FilePath: /nove_api/prisma/seeds/mock/orders/type.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { Product, User, Channel } from '@prisma/client';

export interface CreateOrdersParams {
  users: {
    adminUser: User;
    financeUser: User;
    normalUsers: User[];
  };
  products: Product[];
  channels: Channel[];
}
