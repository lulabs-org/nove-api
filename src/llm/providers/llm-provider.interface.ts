/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-06 00:56:17
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-06 00:56:26
 * @FilePath: /nove_api/src/llm/providers/llm-provider.interface.ts
 * @Description: 
 * 
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved. 
 */

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export interface LlmProvider {
  id: string; // "openai" | "anthropic" | "gemini" ...
  complete(input: {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
    responseFormat?: "text" | "json";
  }): Promise<{ text: string }>;
}