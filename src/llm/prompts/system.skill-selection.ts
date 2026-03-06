/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-03-06 00:59:23
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-06 13:03:21
 * @FilePath: /nove_api/src/llm/prompts/system.skill-selection.ts
 * @Description: 
 * 
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved. 
 */

export function buildSkillSelectionSystemPrompt(skills: { name: string; description: string }[]) {
  const list = skills
    .map(s => `- ${s.name}: ${s.description}`)
    .join("\n");

  return `You are a router that selects relevant Agent Skills.

Return STRICT JSON only:
{
  "useSkills": boolean,
  "selected": string[],      // array of skill names
  "reason": string
}

Available skills (name: description):
${list}

Rules:
- Select at most 3 skills.
- If none apply, set useSkills=false and selected=[].
- Do not invent skill names.
`;
}