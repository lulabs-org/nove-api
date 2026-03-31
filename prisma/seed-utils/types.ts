/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-10 23:59:55
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-11 01:40:44
 * @FilePath: /nove_api/prisma/seed-utils/types.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

export type TableDependencies = Map<string, string[]>;

export interface DatabaseOperationOptions {
  force?: boolean;
}

export type DatabaseCommand = 'seed' | 'clean' | 'drop' | 'reset' | 'analyze';

export interface ParsedCommandLineArgs {
  command: DatabaseCommand;
  force: boolean;
}

export type SeedMode = 'mock' | 'real';
