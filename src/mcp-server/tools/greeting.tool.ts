/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-12 14:56:17
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-12 18:17:30
 * @FilePath: /nove_api/src/mcp-server/tools/greeting.tool.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { Injectable } from '@nestjs/common';
import { Tool, Context } from '@rekog/mcp-nest';
import { z } from 'zod';
import { PublicTool } from '@rekog/mcp-nest';

type Language = 'en' | 'zh' | 'es' | 'fr';

@Injectable()
export class GreetingTool {
  @Tool({
    name: 'greeting-tool',
    description: 'Returns a greeting with progress updates',
    parameters: z.object({
      name: z.string().default('Guest'),
      language: z.enum(['en', 'zh', 'es', 'fr']).default('en'),
    }),
  })
  @PublicTool()
  async sayHello(
    { name, language }: { name: string; language: Language },
    context: Context,
  ) {
    await context.reportProgress({ progress: 50, total: 100 });

    const greetings: Record<Language, string> = {
      en: `Hello, ${name}!`,
      zh: `你好，${name}！`,
      es: `¡Hola, ${name}!`,
      fr: `Bonjour, ${name}!`,
    };

    await context.reportProgress({ progress: 100, total: 100 });

    return {
      message: greetings[language],
      timestamp: new Date().toISOString(),
    };
  }
}
