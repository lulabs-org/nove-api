import { Module } from '@nestjs/common';
import { MeetingController } from './controllers/meeting.controller';
import { MeetingService } from './services/meeting.service';
import { MeetingRepository } from './repositories/meeting.repository';
import { MeetingParticipantRepository } from './repositories/meeting-participant.repository';
import { MeetingOrganizationService } from './services/meeting-organization.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MinuteModule } from '../minute/minute.module';

@Module({
  imports: [PrismaModule, MinuteModule],
  controllers: [MeetingController],
  providers: [
    MeetingService,
    MeetingOrganizationService,
    MeetingRepository,
    MeetingParticipantRepository,
  ],
  exports: [
    MeetingService,
    MeetingOrganizationService,
    MeetingRepository,
    MeetingParticipantRepository,
  ],
})
export class MeetingModule {}
