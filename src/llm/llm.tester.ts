import { Injectable, OnModuleInit } from '@nestjs/common';
import OpenAI from 'openai';
import {
  ConfigTestProvider,
  SystemConfigValues,
} from '@/admin/system-config';
import { TesterService } from '@/admin/system-config/services/tester.service';

@Injectable()
export class LlmTesterService implements ConfigTestProvider, OnModuleInit {
  constructor(private readonly testerService: TesterService) {}

  onModuleInit() {
    this.testerService.registerProvider('ai', this);
  }

  async test(value: SystemConfigValues): Promise<void> {
    const client = new OpenAI({
      apiKey: String(value.apiKey),
      baseURL: String(value.baseUrl),
    });
    await client.chat.completions.create({
      model: String(value.model),
      max_tokens: 1,
      temperature: 0,
      messages: [{ role: 'user', content: 'ping' }],
    });
  }
}
