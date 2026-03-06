/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-06 01:31:05
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-06 01:34:08
 * @FilePath: /nove_api/src/skills/skills.service.ts
 * @Description: 
 * 
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved. 
 */

import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { parseSkillMd } from "../common/utils/skills/skill-md.parser";
import { validateSkillFrontmatter } from "../common/utils/skills/skill-md.validator";

@Injectable()
export class SkillsService {
  private prisma = new PrismaClient();

  async importSkillMd(userId: string, rawSkillMd: string) {
    const parsed = parseSkillMd(rawSkillMd);
    validateSkillFrontmatter(parsed.frontmatter);

    // 可选：限制 body 大小（符合 progressive disclosure 建议）
    if (parsed.body.length > 200_000) {
      throw new BadRequestException("SKILL.md too large");
    }

    const metadataJson = parsed.frontmatter.metadata
      ? JSON.stringify(parsed.frontmatter.metadata)
      : null;

    const upserted = await this.prisma.skill.upsert({
      where: { userId_name: { userId, name: parsed.frontmatter.name } },
      create: {
        userId,
        name: parsed.frontmatter.name,
        description: parsed.frontmatter.description,
        license: parsed.frontmatter.license ?? null,
        compatibility: parsed.frontmatter.compatibility ?? null,
        metadataJson,
        allowedTools: parsed.frontmatter.allowedTools ?? null,
        bodyMarkdown: parsed.body,
        rawSkillMd,
      },
      update: {
        description: parsed.frontmatter.description,
        license: parsed.frontmatter.license ?? null,
        compatibility: parsed.frontmatter.compatibility ?? null,
        metadataJson,
        allowedTools: parsed.frontmatter.allowedTools ?? null,
        bodyMarkdown: parsed.body,
        rawSkillMd,
      },
    });

    return {
      id: upserted.id,
      name: upserted.name,
      description: upserted.description,
      updatedAt: upserted.updatedAt,
    };
  }

  async listSkills(userId: string, q?: string) {
    const rows = await this.prisma.skill.findMany({
      where: q
        ? {
            userId,
            OR: [
              { name: { contains: q } },
              { description: { contains: q } },
            ],
          }
        : { userId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, description: true, updatedAt: true },
    });
    return rows;
  }

  async getSkillByName(userId: string, name: string) {
    return this.prisma.skill.findUnique({
      where: { userId_name: { userId, name } },
    });
  }
}