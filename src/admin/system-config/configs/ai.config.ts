import { UpdateAiConfigDto } from '../dto/ai-config.dto';
import { defineSystemConfig, environment } from './system-config.definition';

const AI_KEY_ENVIRONMENT = ['ARK_API_KEY', 'OPENAI_API_KEY'] as const;

export const aiConfig = defineSystemConfig(UpdateAiConfigDto, {
  description: 'Organization AI Model Configuration',
  fields: {
    provider: {
      default: 'custom',
      environment: environment.custom(AI_KEY_ENVIRONMENT, (values) =>
        values.ARK_API_KEY
          ? 'ark'
          : values.OPENAI_API_KEY
            ? 'openai'
            : undefined,
      ),
    },
    apiKey: {
      required: true,
      secret: true,
      environment: environment.custom(
        AI_KEY_ENVIRONMENT,
        (values) => values.ARK_API_KEY || values.OPENAI_API_KEY,
      ),
    },
    baseUrl: {
      required: true,
      default: 'https://ark.cn-beijing.volces.com/api/v3',
      environment: environment.string('OPENAI_BASE_URL'),
    },
    model: {
      required: true,
      default: '{TEMPLATE_ENDPOINT_ID}',
      environment: environment.string('OPENAI_MODEL'),
    },
    maxTokens: {
      default: 16000,
      environment: environment.number('OPENAI_MAX_TOKENS'),
    },
    temperature: {
      default: 0.7,
      environment: environment.number('OPENAI_TEMPERATURE'),
    },
  },
});
