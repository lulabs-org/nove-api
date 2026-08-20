import { Module } from '@nestjs/common';
import { MeetingController } from './controllers/meeting.controller';
import { MeetingService } from './services/meeting.service';
import { MeetingRepository } from './repositories/meeting.repository';
import { MeetingParticipantRepository } from './repositories/meeting-participant.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { MinuteModule } from '../minute/minute.module';

@Module({
  imports: [PrismaModule, MinuteModule],
  controllers: [MeetingController],
  providers: [
    MeetingService,
    MeetingRepository,
    MeetingParticipantRepository,
  ],
  exports: [
    MeetingService,
    MeetingRepository,
    MeetingParticipantRepository,
  ],
})
export class MeetingModule {}
