import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

type CreateMeetingUserActionData = Prisma.MeetingUserActionUncheckedCreateInput;
type UpdateMeetingUserActionData = Prisma.MeetingUserActionUncheckedUpdateInput;

@Injectable()
export class MeetingUserActionRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create meeting user action record
   */
  async create(data: CreateMeetingUserActionData) {
    return this.prisma.meetingUserAction.create({
      data,
    });
  }

  /**
   * Find meeting user action by ID
   */
  async findById(id: string) {
    return this.prisma.meetingUserAction.findUnique({
      where: { id },
    });
  }

  /**
   * Find meeting user actions by meeting ID
   */
  async findByMeetingId(meetingId: string) {
    return this.prisma.meetingUserAction.findMany({
      where: { meetingId },
      orderBy: { actionAt: 'desc' },
    });
  }

  /**
   * Find meeting user actions by platform user ID
   */
  async findByPtUserId(ptUserId: string) {
    return this.prisma.meetingUserAction.findMany({
      where: { ptUserId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update meeting user action record
   */
  async update(id: string, data: UpdateMeetingUserActionData) {
    return this.prisma.meetingUserAction.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete meeting user action record
   */
  async delete(id: string) {
    return this.prisma.meetingUserAction.delete({
      where: { id },
    });
  }
}
