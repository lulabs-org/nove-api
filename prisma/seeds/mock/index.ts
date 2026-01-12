/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-11 05:21:40
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-12 04:06:46
 * @FilePath: /nove_api/prisma/seeds/mock/index.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
export * from './core';
export * from './users';
export type { CreatedUsers } from './users';
export * from './departments';
export * from './permissions';
export * from './products';
export * from './projects';
export * from './curriculums';
export * from './channels';
export * from './platform-users';
export * from './meetings';
export * from './transcripts';
export * from './orders';
export * from './refunds';
export * from './relations';
export { createAdmin } from '../real/admin';
export type { CreatedAdmin } from '../real/admin';
