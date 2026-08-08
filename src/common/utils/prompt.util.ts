const PROMPT_TEMPLATES = {
  PARTICIPANT_SUMMARY: {
    system: '你是专业的会议总结助手，擅长为参会者提供个性化、实用的会议总结。',
    user: `请为参会者 {{userName}} 生成会议总结。
需要总结的参会者姓名: {{userName}}
会议ID: {{meetingId}}
会议主题: {{meetingTitle}}
会议时间（北京时间）: {{startTime}} 至 {{endTime}}
会议纪要: {{meetingSummaryMinutes}}
关键要点: {{meetingSummaryKeyPoints}}
行动项: {{meetingSummaryActionItems}}
决策记录: {{meetingSummaryDecisions}}
会议金句: {{meetingSummaryGoldenQuotes}}
关键词: {{meetingSummaryKeywords}}
会议转录格式：[时间戳, 说话人姓名, 内容]
会议转录内容: {{segments}}
请根据以上信息，为参会者 {{userName}} 生成一份个性化的会议总结，重点关注与该参会者相关的内容。`,
  },
  PERIOD_SUMMARY: {
    system: `你是人工智能助手，需要总结用户"{{userName}}"{{ctxLabel}} 的会议记录。
      字段说明：
      - userName: 参会人在 onstage会议的昵称
      - partSummary: 参会人 onstage会议的总结
      - periodStart: 会议总结的开始区间
      - periodEnd: 会议总结的结束区间

      切记以上只是字段解释，不是输出内容。
      你只需要根据用户输入，总结用户在会议中的活动，输出 markdown 格式的总结。`,
    user: `{{leanSummaries}}`,
  },
};

export type PromptTemplateKey = keyof typeof PROMPT_TEMPLATES;

/**
 * 通用的 Prompt 渲染函数，将变量替换到模板中
 */
function renderTemplate(template: string, variables: Record<string, any>): string {
  return template.replace(/\{\{([^{}]+)\}\}/g, (match, key) => {
    const trimmedKey = key.trim();
    const value = variables[trimmedKey];

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return value !== undefined && value !== null ? String(value) : '暂无数据';
  });
}

/**
 * 根据模板名称生成 System 和 User Prompt
 */
export function generatePrompt(promptKey: PromptTemplateKey, variables: Record<string, any>) {
  const template = PROMPT_TEMPLATES[promptKey];
  if (!template) {
    throw new Error(`Prompt template ${promptKey} not found`);
  }

  const systemPrompt = renderTemplate(template.system, variables);
  const prompt = renderTemplate(template.user, variables);

  return { systemPrompt, prompt };
}
