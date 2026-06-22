/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-24 00:00:00
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-22 03:02:34
 * @FilePath: /nove_api/src/integrations/tencent-meeting/services/transcript.service.ts
 * @Description: 转写服务，负责获取和格式化录音转写内容
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import { Injectable, Logger } from '@nestjs/common';
import { TencentApiService } from './api.service';
import { FormatService } from './format.service';
import { TranscriptResult } from '../types';

/**
 * 转写服务
 * 负责获取和格式化录音转写内容
 */
@Injectable()
export class TranscriptService {
  private readonly logger = new Logger(TranscriptService.name);
  private readonly emptyResult: TranscriptResult = {
    paragraphs: [],
    speakers: [],
    text: '',
    keywords: [],
  };

  constructor(
    private readonly api: TencentApiService,
    private readonly formatter: FormatService,
  ) {}

  /**
   * 获取录音转写内容
   * @param fileId 录制文件ID
   * @param userId 用户ID
   * @returns 包含原始响应、唯一用户名、格式化转写和关键词的结果
   */
  async fetch(fileId: string, userId: string): Promise<TranscriptResult> {
    // 记录开始时间，用于后续计算接口调用及处理的耗时
    const startTime = Date.now();
    // 封装基础日志上下文，方便在各个日志输出点统一追踪请求来源
    const context = { fileId, userId };

    this.logger.log('开始获取录音转写', context);

    try {
      // 1. 调用腾讯会议底层 API 获取原始转写数据
      // 使用 || {} 防止接口返回 null 或 undefined 导致解构报错
      const { minutes } = (await this.api.getTranscript(fileId, userId)) || {};

      // 2. 数据校验：如果不存在段落信息，说明没有有效的转写内容，直接返回默认的空结构
      if (!minutes?.paragraphs) return this.emptyResult;

      // 3. 提取有效数据：
      // paragraphs 是原始的会议发言段落数据
      // keywords 为系统提取的关键信息，若接口未返回则默认降级为空数组
      const { paragraphs, keywords = [] } = minutes;

      // 4. 核心格式化处理：
      // 通过 formatter 将结构化的段落清洗并转换为可读的纯文本 (text)
      // 同时提取出整个转写中出现过的所有发言人列表，并完成去重处理 (speakers)
      const { speakers, text } = this.formatter.format(paragraphs);

      // 5. 记录成功日志，附加关键统计指标便于后续监控与故障排查
      this.logger.log('获取录音转写成功', {
        ...context,
        duration: Date.now() - startTime, // 整体执行耗时（毫秒）
        speakersCount: speakers.length, // 识别出的独立发言人数量
        keywordsCount: keywords.length, // 包含的关键词数量
        textLinesCount: text.split('\n\n').length, // 格式化后生成的文本行数（段落数）
      });

      // 6. 将处理好的全量字段打包并统一返回
      return { paragraphs, speakers, text, keywords };
    } catch (error: unknown) {
      // 捕获网络异常、API调用错误或数据解析异常，避免服务崩溃
      // 提取安全的错误描述：Error 对象提取 message，其它类型强制转换为字符串
      this.logger.warn('获取录音转写失败', {
        ...context,
        error: error instanceof Error ? error.message : String(error),
      });

      // 发生异常时触发容灾降级机制，返回安全的空数据以保证主干业务流转
      return this.emptyResult;
    }
  }
}
