import { Module } from "@nestjs/common";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { SkillsModule } from "../skills/skills.module";
import { LlmModule } from "../llm/llm.module";

@Module({
  imports: [SkillsModule, LlmModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
