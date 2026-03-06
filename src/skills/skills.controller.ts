/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-06 01:30:40
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-06 01:42:35
 * @FilePath: /nove_api/src/skills/skills.controller.ts
 * @Description: 
 * 
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved. 
 */

import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Get,
  Query,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { SkillsService } from "./skills.service";

@Controller("skills")
export class SkillsController {
  constructor(private readonly skills: SkillsService) {}

  // 简化：用 header 传 userId；生产环境请换 JWT/Auth
  private getUserId(): string {
    return "demo-user";
  }

  @Post("import")
  @UseInterceptors(FileInterceptor("file"))
  async importSkill(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException("file is required");
    const raw = file.buffer.toString("utf-8");
    return this.skills.importSkillMd(this.getUserId(), raw);
  }

  @Get()
  async list(@Query("q") q?: string) {
    return this.skills.listSkills(this.getUserId(), q);
  }
}