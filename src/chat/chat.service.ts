import { Injectable } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { ChatDto } from "./dto/chat.dto";
import { SkillsService } from "../skills/skills.service";
import { LlmService } from "../llm/llm.service";
import { buildSkillSelectionSystemPrompt } from "../llm/prompts/system.skill-selection";

@Injectable()
export class ChatService {
  private prisma = new PrismaClient();

  constructor(
    private readonly skills: SkillsService,
    private readonly llm: LlmService,
  ) {}

  async chat(userId: string, input: ChatDto) {
    // 1) conversation
    const conv =
      input.conversationId
        ? await this.prisma.conversation.findFirst({ where: { id: input.conversationId, userId } })
        : await this.prisma.conversation.create({ data: { userId } });

    if (!conv) {
      // 简化处理：实际可抛 404
      throw new Error("Conversation not found");
    }

    // 2) save user message
    await this.prisma.message.create({
      data: { conversationId: conv.id, role: "user", content: input.message },
    });

    // 3) load recent history
    const history = await this.prisma.message.findMany({
      where: { conversationId: conv.id },
      orderBy: { createdAt: "asc" },
      take: 30,
      select: { role: true, content: true },
    });

    // 4) discovery: send ONLY name+description list to model to choose skills
    const allSkills = await this.skills.listSkills(userId);
    const selectionPrompt = buildSkillSelectionSystemPrompt(
      allSkills.map(s => ({ name: s.name, description: s.description })),
    );

    const provider = this.llm.getProvider(input.provider);

    const selectionRes = await provider.complete({
      model: input.model,
      temperature: 0,
      responseFormat: "json",
      messages: [
        { role: "system", content: selectionPrompt },
        { role: "user", content: input.message },
      ],
    });

    let selected: string[] = [];
    try {
      const obj = JSON.parse(selectionRes.text || "{}");
      selected = Array.isArray(obj.selected) ? obj.selected.slice(0, 3) : [];
    } catch {
      selected = [];
    }

    // 5) activation: load full SKILL.md body only for selected skills
    const activatedSkills: { name: string; bodyMarkdown: string }[] = [];
    for (const name of selected) {
      const skill = await this.skills.getSkillByName(userId, name);
      if (skill) activatedSkills.push({ name: skill.name, bodyMarkdown: skill.bodyMarkdown });
    }

    const skillContext =
      activatedSkills.length === 0
        ? ""
        : `Activated Agent Skills:\n\n${activatedSkills
            .map(s => `## SKILL: ${s.name}\n${s.bodyMarkdown}`)
            .join("\n\n")}`;

    // 6) final completion with history + (optional) skill instructions
    const finalRes = await provider.complete({
      model: input.model,
      temperature: input.temperature ?? 0.3,
      messages: [
        {
          role: "system",
          content:
            `You are a helpful assistant. Follow any activated skill instructions if present.\n\n` +
            skillContext,
        },
        ...history.map(m => ({ role: m.role as any, content: m.content })),
      ],
    });

    // 7) save assistant message
    const assistantMsg = await this.prisma.message.create({
      data: { conversationId: conv.id, role: "assistant", content: finalRes.text },
    });

    return {
      conversationId: conv.id,
      selectedSkills: activatedSkills.map(s => s.name),
      message: { id: assistantMsg.id, role: assistantMsg.role, content: assistantMsg.content },
    };
  }
}