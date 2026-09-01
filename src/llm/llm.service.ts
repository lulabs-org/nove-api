import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import OpenAI from 'openai';
import {
  SingleOrgContextService,
  SystemConfigChangeEvent,
  SystemConfigService,
} from '@/admin/system-config/services';
import { OnEvent } from '@nestjs/event-emitter';
import { SystemConfigRegistry } from '@/admin/system-config/registries/system-config.registry';
import { getDefaultValues } from '@/admin/system-config/configs';

@Injectable()
export class LlmService implements OnModuleInit {
  private readonly logger = new Logger(LlmService.name);
  private openai: OpenAI;
  private activeConfig: {
    model: string;
    maxTokens: number;
    temperature: number;
  };

  constructor(
    private readonly systemConfigService: SystemConfigService,
    private readonly orgContext: SingleOrgContextService,
  ) {
    const defaults = getDefaultValues(SystemConfigRegistry.ai);
    this.openai = new OpenAI({
      apiKey: '',
      baseURL: String(defaults.baseUrl),
    });
    this.activeConfig = {
      model: String(defaults.model),
      maxTokens: Number(defaults.maxTokens),
      temperature: Number(defaults.temperature),
    };
  }

  async onModuleInit() {
    await this.reloadConfig();
  }

  @OnEvent('config.ai.updated')
  async handleConfigUpdated(event: SystemConfigChangeEvent) {
    if (!this.orgContext.matches(event.orgId)) return;
    await this.reloadConfig();
  }

  @OnEvent('config.ai.deleted')
  async handleConfigDeleted(event: SystemConfigChangeEvent) {
    if (!this.orgContext.matches(event.orgId)) return;
    await this.reloadConfig();
  }

  getActiveModel(): string {
    return this.activeConfig.model;
  }

  private async reloadConfig() {
    const { value } = await this.systemConfigService.getEffectiveConfig(
      this.orgContext.getOrgId(),
      'ai',
    );
    const apiKey = String(value.apiKey ?? '');
    this.openai = new OpenAI({
      apiKey,
      baseURL: String(value.baseUrl ?? ''),
    });
    this.activeConfig = {
      model: String(value.model ?? ''),
      maxTokens: Number(value.maxTokens ?? 16000),
      temperature: Number(value.temperature ?? 0.7),
    };
  }

  /**
   * 创建聊天完成（非流式）
   * @param messages 消息数组
   * @param model 模型名称
   * @param options 其他选项
   */
  async createChatCompletion(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    model?: string,
    options?: {
      maxTokens?: number;
      temperature?: number;
    },
  ): Promise<string> {
    try {
      const configModel = this.activeConfig.model;
      const configMaxTokens = this.activeConfig.maxTokens;
      const configTemperature = this.activeConfig.temperature;

      const completion = await this.openai.chat.completions.create({
        messages,
        model: model || configModel,
        max_tokens: options?.maxTokens || configMaxTokens,
        temperature: options?.temperature || configTemperature,
      });

      const content = completion.choices[0]?.message?.content;
      this.logger.log(`OpenAI聊天完成，使用模型: ${model || configModel}`);
      return content || '';
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`OpenAI聊天完成失败: ${errorMessage}`);
      throw new Error(`OpenAI API调用失败: ${errorMessage}`);
    }
  }

  /**
   * 创建聊天完成（流式）
   * @param messages 消息数组
   * @param model 模型名称
   * @param options 其他选项
   */
  async createChatCompletionStream(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    model?: string,
    options?: {
      maxTokens?: number;
      temperature?: number;
    },
  ): Promise<AsyncIterableIterator<string>> {
    try {
      const configModel = this.activeConfig.model;
      const configMaxTokens = this.activeConfig.maxTokens;
      const configTemperature = this.activeConfig.temperature;

      const stream = await this.openai.chat.completions.create({
        messages,
        model: model || configModel,
        max_tokens: options?.maxTokens || configMaxTokens,
        temperature: options?.temperature || configTemperature,
        stream: true,
      });

      this.logger.log(`OpenAI流式聊天完成，使用模型: ${model || configModel}`);

      // 将流转换为字符串迭代器
      const stringStream = this.convertStreamToStringIterator(stream);
      return stringStream;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`OpenAI流式聊天完成失败: ${errorMessage}`);
      throw new Error(`OpenAI API调用失败: ${errorMessage}`);
    }
  }

  /**
   * 将OpenAI流转换为字符串迭代器
   */
  private async *convertStreamToStringIterator(
    stream: AsyncIterable<OpenAI.Chat.ChatCompletionChunk>,
  ): AsyncIterableIterator<string> {
    for await (const part of stream) {
      const content = part.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }

  /**
   * 简单的问答方法
   * @param question 用户问题
   * @param systemPrompt 系统提示词
   */
  async ask(
    question: string,
    systemPrompt: string = '你是人工智能助手',
  ): Promise<string> {
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: question },
    ];

    return this.createChatCompletion(messages);
  }

  /**
   * 流式问答方法
   * @param question 用户问题
   * @param systemPrompt 系统提示词
   */
  async askStream(
    question: string,
    systemPrompt: string = '你是人工智能助手',
  ): Promise<AsyncIterableIterator<string>> {
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: question },
    ];

    return this.createChatCompletionStream(messages);
  }
}
