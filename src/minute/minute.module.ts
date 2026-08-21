import { Module } from '@nestjs/common';
import { MinuteController } from './controllers/minute.controller';
import { MinuteSummaryController } from './controllers/minute-summary.controller';
import { SpeakerSummaryController } from './controllers/speaker-summary.controller';
import { TranscriptController } from './controllers/transcript.controller';
import { MinuteService } from './services/minute.service';
import { MinuteSummaryService } from './services/minute-summary.service';
import { SpeakerSummaryCrudService } from './services/speaker-summary-crud.service';
import { SpeakerSummaryService } from './services/speaker-summary.service';
import { TranscriptService } from './services/transcript.service';
import { MinuteRepository } from './repositories/minute.repository';
import { MinuteSummaryRepository } from './repositories/minute-summary.repository';
import { SpeakerSummaryRepository } from './repositories/speaker-summary.repository';
import { MinuteFileRepository } from './repositories/minute-file.repository';
import { TranscriptRepository } from './repositories/transcript.repository';
import { LlmModule } from '@/llm/llm.module';
import { ConfigModule } from '@nestjs/config';
import { openaiConfig } from '@/configs/openai.config';
import { PrismaModule } from '@/prisma/prisma.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    PrismaModule,
    LlmModule,
    ConfigModule.forFeature(openaiConfig),
    HttpModule,
  ],
  controllers: [
    MinuteController,
    MinuteSummaryController,
    SpeakerSummaryController,
    TranscriptController,
  ],
  providers: [
    MinuteService,
    MinuteSummaryService,
    SpeakerSummaryCrudService,
    SpeakerSummaryService,
    TranscriptService,
    MinuteRepository,
    MinuteSummaryRepository,
    SpeakerSummaryRepository,
    MinuteFileRepository,
    TranscriptRepository,
  ],
  exports: [
    MinuteService,
    MinuteSummaryService,
    SpeakerSummaryCrudService,
    SpeakerSummaryService,
    TranscriptService,
    MinuteRepository,
    MinuteSummaryRepository,
    SpeakerSummaryRepository,
    MinuteFileRepository,
    TranscriptRepository,
  ],
})
export class MinuteModule {}
