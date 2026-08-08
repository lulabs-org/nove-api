const PROMPT_TEMPLATES = {
  PARTICIPANT_SUMMARY: {
    system:
      '你是专业的会议总结助手，擅长根据会议背景和发言记录，为特定的参会者提炼结构化、个性化的总结。请使用 Markdown 格式输出。',
    user: `你需要为参会者【{{userName}}】生成专属的个人会议总结。

【会议全局背景】
会议主题: {{meetingTitle}}
会议时间: {{startTime}} 至 {{endTime}}
关键词: {{keywords}}
会议纪要: {{minutes}}
关键要点: {{keyPoints}}
行动项: {{actionItems}}
决策记录: {{decisions}}
会议金句: {{goldenQuotes}}

【专属转录片段】
格式为：[时间戳, 说话人姓名, 内容]
{{segments}}

【生成要求】
请结合会议全局背景，重点分析上述专属转录片段中【{{userName}}】的发言，生成以下结构的总结：
1. **参与概况**：简述该参会者在会议中主要参与了哪些话题的讨论。
2. **核心观点**：提炼该参会者表达的主要观点、提出的疑问或建议。
3. **个人行动项**：梳理与该参会者直接相关的待办事项或后续计划。

注意：
- 必须突出【{{userName}}】本人的贡献。
- 专属转录片段中为了提供语境，包含了他人的上下文对话。请仔细分辨说话人，切勿将他人的观点张冠李戴。
- 如果某项内容（如个人行动项）在片段中未体现，请直接标明“无相关记录”，不要凭空捏造。`,
  },
  PERIOD_SUMMARY: {
    system:
      '你是一位专业的 AI 会议总结助手，擅长将个人的多次零散总结提炼为一份高质量的阶段性（如周报、月报）聚合总结。请务必使用 Markdown 格式输出。',
    user: `你需要为用户【{{userName}}】生成一份【{{ctxLabel}}】的聚合会议总结。

【输入数据格式说明】
以下数据是一个 JSON 数组，每一项代表该用户在不同时间段（某次会议或某天）的个人总结记录：
{{leanSummaries}}

【生成要求】
请仔细阅读上述记录，提炼并生成一份连贯的【{{ctxLabel}}】总结。请包含以下结构：
1. **{{ctxLabel}}参与概况**：简述该用户在{{ctxLabel}}的主要工作方向、参与了哪些核心事务的讨论。
2. **重点成果与观点**：聚合梳理该用户在各次会议中取得的重要进展或提出的关键意见。
3. **后续重点（待办事项）**：提取需要该用户在未来继续跟进或完成的行动项。

注意：
- 必须基于提供的 JSON 数据进行总结，不要编造任何未提及的内容。
- 若某一项（如待办事项）在输入数据中完全没有体现，请标明“无相关记录”。
- 语言要精炼、结构化，整体风格应贴近一份专业的职场总结（如周报/月报）。`,
  },
};

export type PromptTemplateKey = keyof typeof PROMPT_TEMPLATES;

/**
 * 通用的 Prompt 渲染函数，将变量替换到模板中
 */
function renderTemplate(
  template: string,
  variables: Record<string, any>,
): string {
  return template.replace(/\{\{([^{}]+)\}\}/g, (match: string, key: string) => {
    const trimmedKey = key.trim();
    const value: unknown = variables[trimmedKey];

    if (value === undefined || value === null) {
      return '暂无数据';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value as string | number | boolean);
  });
}

/**
 * 根据模板名称生成 System 和 User Prompt
 */
export function generatePrompt(
  promptKey: PromptTemplateKey,
  variables: Record<string, any>,
) {
  const template = PROMPT_TEMPLATES[promptKey];
  if (!template) {
    throw new Error(`Prompt template ${promptKey} not found`);
  }

  const systemPrompt = renderTemplate(template.system, variables);
  const prompt = renderTemplate(template.user, variables);

  return { systemPrompt, prompt };
}
