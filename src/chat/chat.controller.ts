/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-06 01:09:07
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-06 14:53:14
 * @FilePath: /nove_api/src/chat/chat.controller.ts
 * @Description: 
 * 
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved. 
 */

import { Body, Controller, Post, Sse, MessageEvent, Query, BadRequestException } from "@nestjs/common";
import { Observable, from, map } from "rxjs";
import { ChatService } from "./chat.service";
import { ChatDtoSchema, ChatDto } from "./dto/chat.dto";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";

@Controller("chat")
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  private getUserId(): string {
    return "demo-user";
  }

  @Post()
  async send(@Body(new ZodValidationPipe(ChatDtoSchema)) body: ChatDto) {
    return this.chat.chat(this.getUserId(), body);
  }

  @Sse("stream")
  stream(@Query("provider") provider: string, @Query("model") model: string, @Query("message") message: string): Observable<MessageEvent> {
    if (!provider || !model || !message) {
      throw new BadRequestException("Missing required query parameters: provider, model, message");
    }

    const input: ChatDto = {
      provider: provider as "openai" | "anthropic",
      model,
      message,
      stream: true,
    };

    return from(this.chat.streamChat(this.getUserId(), input)).pipe(
      map(data => ({ data })),
    );
  }
}