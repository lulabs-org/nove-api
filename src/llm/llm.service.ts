import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import OpenAI from 'openai';
import { openaiConfig } from '../configs/openai.config';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private openai: OpenAI;

  constructor(
    @Inject(openaiConfig.KEY)
    private readonly config: ConfigType<typeof openaiConfig>,
  ) {
    const apiKey = this.config.apiKey.ark || this.config.apiKey.openai || '';
    const baseURL = this.config.baseURL;

    if (!apiKey) {
      this.logger.warn('OpenAI API密钥未配置，OpenAI服务将不可用');
    }

    this.openai = new OpenAI({
      apiKey,
      baseURL,
    });
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
      const configModel = this.config.model;
      const configMaxTokens = this.config.maxTokens;
      const configTemperature = this.config.temperature;

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
      const configModel = this.config.model;
      const configMaxTokens = this.config.maxTokens;
      const configTemperature = this.config.temperature;

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
