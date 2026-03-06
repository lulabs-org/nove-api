/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-06 00:55:18
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-06 01:11:20
 * @FilePath: /nove_api/src/llm/llm.service.ts
 * @Description: 
 * 
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved. 
 */

import { Injectable, BadRequestException } from "@nestjs/common";
import { LlmProvider } from "./providers/llm-provider.interface";
import { OpenAiProvider } from "./providers/openai.provider";
import { AnthropicProvider } from "./providers/anthropic.provider";
// import { GeminiProvider } from "./providers/gemini.provider";

@Injectable()
export class LlmService {
  private providers: Record<string, LlmProvider> = {
    openai: new OpenAiProvider(),
    anthropic: new AnthropicProvider(),
    // gemini: new GeminiProvider(),
  };

  getProvider(providerId: string): LlmProvider {
    const p = this.providers[providerId];
    if (!p) throw new BadRequestException(`Unknown provider: ${providerId}`);
    return p;
  }
}