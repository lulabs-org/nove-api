/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-06 00:55:18
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-06 14:44:20
 * @FilePath: /nove_api/src/llm/llm.service.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { Injectable, BadRequestException } from '@nestjs/common';
import { LlmProvider, ChatMessage } from './providers/llm-provider.interface';
import { OpenAiProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';

@Injectable()
export class LlmService {
  private providers: Record<string, LlmProvider> = {
    openai: new OpenAiProvider(),
    anthropic: new AnthropicProvider(),
  };

  getProvider(providerId: string): LlmProvider {
    const p = this.providers[providerId];
    if (!p) throw new BadRequestException(`Unknown provider: ${providerId}`);
    return p;
  }

  async complete(
    providerId: string,
    input: {
      model: string;
      messages: ChatMessage[];
      temperature?: number;
      responseFormat?: 'text' | 'json';
    },
  ): Promise<{ text: string }> {
    const provider = this.getProvider(providerId);
    return provider.complete(input);
  }

  streamComplete(
    providerId: string,
    input: {
      model: string;
      messages: ChatMessage[];
      temperature?: number;
      responseFormat?: 'text' | 'json';
    },
  ): AsyncGenerator<{ text: string }> {
    const provider = this.getProvider(providerId);
    return provider.streamComplete(input);
  }
}
