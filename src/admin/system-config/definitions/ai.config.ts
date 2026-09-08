import { UpdateAiConfigDto } from '../dto/ai-config.dto';
import { defineSystemConfig } from '../core';

export const aiConfig = defineSystemConfig(UpdateAiConfigDto, {
  description: 'Organization AI Model Configuration',
  fields: {
    provider: {
      default: 'openai',
    },
    apiKey: {
      required: true,
      secret: true,
    },
    baseUrl: {
      required: true,
      default: 'https://ark.cn-beijing.volces.com/api/v3',
    },
    model: {
      required: true,
      default: '{TEMPLATE_ENDPOINT_ID}',
    },
    maxTokens: {
      default: 16000,
    },
    temperature: {
      default: 0.7,
    },
  },
});

