import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, MeetingParticipant } from '@prisma/client';

@Injectable()
export class MeetingParticipantRepository {
  constructor(private prisma: PrismaService) {}

  async upsert(
    meetingId: string,
    ptUserId: string,
    data: Omit<
      Prisma.MeetingParticipantUncheckedCreateInput,
      'id' | 'meetingId' | 'ptUserId' | 'createdAt' | 'updatedAt' | 'deletedAt'
    >,
  ): Promise<MeetingParticipant> {
    const existing = await this.prisma.meetingParticipant.findFirst({
      where: {
        meetingId,
        ptUserId,
        deletedAt: null,
      },
    });

    const updateData: Prisma.MeetingParticipantUncheckedUpdateInput = {
      ...data,
    };

    if (existing) {
      return this.prisma.meetingParticipant.update({
        where: { id: existing.id },
        data: updateData,
      });
    }

    return this.prisma.meetingParticipant.create({
      data: {
        meetingId,
        ptUserId,
        ...data,
      },
    });
  }
}
