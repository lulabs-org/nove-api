/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-06 01:32:43
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-06 01:39:42
 * @FilePath: /nove_api/src/common/utils/skills/skill-md.parser.ts
 * @Description: 
 * 
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved. 
 */

import matter from "gray-matter";

export type SkillFrontmatter = {
  name: string;
  description: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
  'allowed-tools'?: string; // 注意：YAML key 里有 '-'，用索引访问
  allowedTools?: string;  // 也兼容驼峰写法（可选）
};

export type ParsedSkillMd = {
  frontmatter: {
    name: string;
    description: string;
    license?: string;
    compatibility?: string;
    metadata?: Record<string, string>;
    allowedTools?: string;
  };
  body: string;
  raw: string;
};

export function parseSkillMd(raw: string): ParsedSkillMd {
  const parsed = matter(raw);
  const fm = (parsed.data ?? {}) as SkillFrontmatter;

  const allowedTools =
    (fm["allowed-tools"] as string | undefined) ?? fm.allowedTools;

  return {
    frontmatter: {
      name: String(fm.name ?? "").trim(),
      description: String(fm.description ?? "").trim(),
      license: fm.license ? String(fm.license).trim() : undefined,
      compatibility: fm.compatibility ? String(fm.compatibility).trim() : undefined,
      metadata: fm.metadata ?? undefined,
      allowedTools: allowedTools ? String(allowedTools).trim() : undefined,
    },
    body: String(parsed.content ?? "").trim(),
    raw,
  };
}