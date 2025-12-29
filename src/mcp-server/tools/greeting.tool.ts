import { Injectable } from '@nestjs/common';
import { Tool, Context } from '@rekog/mcp-nest';
import { z } from 'zod';

type Language = 'en' | 'zh' | 'es' | 'fr';

@Injectable()
export class GreetingTool {
  @Tool({
    name: 'greeting-tool',
    description: 'Returns a greeting with progress updates',
    parameters: z.object({
      name: z.string().default('World'),
      language: z.enum(['en', 'zh', 'es', 'fr']).default('en'),
    }),
  })
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
