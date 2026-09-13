import { Injectable, OnModuleInit } from '@nestjs/common';
import OpenAI from 'openai';
import {
  IntegrationTestProvider,
  IntegrationValues,
  IntegrationTesterService,
} from '@/admin/integrations';

@Injectable()
export class LlmTesterService implements IntegrationTestProvider, OnModuleInit {
  constructor(private readonly testerService: IntegrationTesterService) {}

  onModuleInit() {
    this.testerService.registerProvider('ai', this);
  }

  async test(value: IntegrationValues): Promise<void> {
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
