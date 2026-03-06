/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-06 00:54:55
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-06 00:58:16
 * @FilePath: /nove_api/src/llm/llm.module.ts
 * @Description: 
 * 
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved. 
 */

import { Module } from "@nestjs/common";
import { LlmService } from "./llm.service";

@Module({
  providers: [LlmService],
  exports: [LlmService],
})
export class LlmModule {}