/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-06 00:57:36
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-06 01:04:04
 * @FilePath: /nove_api/src/llm/providers/anthropic.provider.ts
 * @Description: 
 * 
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved. 
 */

import Anthropic from "@anthropic-ai/sdk";
import { LlmProvider, ChatMessage } from "./llm-provider.interface";

export class AnthropicProvider implements LlmProvider {
  id = "anthropic";
  private client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  async complete(input: {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
    responseFormat?: "text" | "json";
  }): Promise<{ text: string }> {
    // Anthropic 的 messages 结构略不同，这里做最小适配：把 system 拆出来
    const system = input.messages.filter(m => m.role === "system").map(m => m.content).join("\n\n");
    const msgs = input.messages
      .filter(m => m.role !== "system")
      .map(m => ({ role: m.role, content: m.content }));

    const res = await this.client.messages.create({
      model: input.model,
      temperature: input.temperature ?? 0.2,
      system: system || undefined,
      messages: msgs as any,
      max_tokens: 4096,
    });

    const text = (res.content ?? [])
      .map((c: any) => (c.type === "text" ? c.text : ""))
      .join("");

    return { text };
  }
}