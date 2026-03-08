/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-12-24 00:00:00
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-12-31 20:33:24
 * @FilePath: /lulab_backend/src/hook-tencent-mtg/constants/prompts.ts
 * @Description: 提示词常量
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

/**
 * 参会者个性化总结提示词模板
 * @param subject 会议主题
 * @param startTime 会议开始时间
 * @param endTime 会议结束时间
 * @param username 参会者用户名
 * @param aiMinutes 会议纪要
 * @param todo 待办事项
 * @param transcript 录音转写
 * @returns 构建好的提示词
 */
export const PARTICIPANT_SUMMARY_PROMPT = (
  subject: string,
  startTime: string,
  endTime: string,
  username: string,
  aiMinutes: string,
  todo: string,
  transcript: string,
): string => {
  return `
你是专业的会议总结助手，请为参会者提供个性化的会议总结。

会议信息：
- 会议主题：${subject}
- 会议时间：${startTime} - ${endTime}
- 参会者：${username}

会议内容：
${aiMinutes}

待办事项：
${todo}

录音转写：
${transcript}

请为参会者「${username}」生成一份个性化的会议总结，包含：
1. 会议要点回顾
2. 与该参会者相关的重要讨论
3. 该参会者需要关注的待办事项
4. 后续行动建议
5. 其他重要内容

请用中文回答，保持简洁专业。
  `.trim();
};
