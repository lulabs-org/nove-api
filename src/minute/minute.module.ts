import { Module } from '@nestjs/common';
import { MinuteController } from './controllers/minute.controller';
import { MinuteSummaryController } from './controllers/minute-summary.controller';
import { MinuteParticipantSummaryController } from './controllers/minute-participant-summary.controller';
import { TranscriptController } from './controllers/transcript.controller';
import { MinuteService } from './services/minute.service';
import { MinuteSummaryService } from './services/minute-summary.service';
import { MinuteParticipantSummaryCrudService } from './services/minute-participant-summary-crud.service';
import { MinuteParticipantSummaryService } from './services/minute-participant-summary.service';
import { TranscriptService } from './services/transcript.service';
import { MinuteRepository } from './repositories/minute.repository';
import { MinuteSummaryRepository } from './repositories/minute-summary.repository';
import { MinuteParticipantSummaryRepository } from './repositories/minute-participant-summary.repository';
import { MinuteFileRepository } from './repositories/minute-file.repository';
import { TranscriptRepository } from './repositories/transcript.repository';

@Module({
  controllers: [
    MinuteController,
    MinuteSummaryController,
    MinuteParticipantSummaryController,
    TranscriptController,
  ],
  providers: [
    MinuteService,
    MinuteSummaryService,
    MinuteParticipantSummaryCrudService,
    MinuteParticipantSummaryService,
    TranscriptService,
    MinuteRepository,
    MinuteSummaryRepository,
    MinuteParticipantSummaryRepository,
    MinuteFileRepository,
    TranscriptRepository,
  ],
  exports: [
    MinuteService,
    MinuteSummaryService,
    MinuteParticipantSummaryCrudService,
    MinuteParticipantSummaryService,
    TranscriptService,
    MinuteRepository,
    MinuteSummaryRepository,
    MinuteParticipantSummaryRepository,
    MinuteFileRepository,
    TranscriptRepository,
  ],
})
export class MinuteModule {}
