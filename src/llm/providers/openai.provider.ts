/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-06 00:56:52
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-06 01:04:44
 * @FilePath: /nove_api/src/llm/providers/openai.provider.ts
 * @Description: 
 * 
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved. 
 */

import OpenAI from "openai";
import { LlmProvider, ChatMessage } from "./llm-provider.interface";

export class OpenAiProvider implements LlmProvider {
  id = "openai";
  private client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  async complete(input: {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
    responseFormat?: "text" | "json";
  }): Promise<{ text: string }> {
    const res = await this.client.chat.completions.create({
      model: input.model,
      temperature: input.temperature ?? 0.2,
      messages: input.messages,
      response_format:
        input.responseFormat === "json"
          ? { type: "json_object" }
          : undefined,
    });

    return { text: res.choices?.[0]?.message?.content ?? "" };
  }
}