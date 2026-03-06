/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-06 01:09:07
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-06 01:36:50
 * @FilePath: /nove_api/src/chat/chat.controller.ts
 * @Description: 
 * 
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved. 
 */

import { Body, Controller, Post } from "@nestjs/common";
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
}