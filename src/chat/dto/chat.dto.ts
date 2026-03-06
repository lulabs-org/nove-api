/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-06 01:09:35
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-06 14:47:42
 * @FilePath: /nove_api/src/chat/dto/chat.dto.ts
 * @Description: 
 * 
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved. 
 */

import { z } from "zod";

export const ChatDtoSchema = z.object({
  conversationId: z.string().optional(),
  provider: z.enum(["openai", "anthropic"]).default("openai"),
  model: z.string().min(1),
  message: z.string().min(1),
  temperature: z.number().min(0).max(2).optional(),
  stream: z.boolean().optional(),
});

export type ChatDto = z.infer<typeof ChatDtoSchema>;