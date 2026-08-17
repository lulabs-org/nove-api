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

  async findMany(
    meetingId: string,
    options: { skip: number; take: number; search?: string },
  ) {
    const search = options.search?.trim();
    const where: Prisma.MeetingParticipantWhereInput = {
      meetingId,
      deletedAt: null,
      ...(search
        ? {
            ptUser: {
              deletedAt: null,
              OR: [
                { displayName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
                { ptUserId: { contains: search, mode: 'insensitive' } },
                {
                  user: {
                    deletedAt: null,
                    OR: [
                      { username: { contains: search, mode: 'insensitive' } },
                      { email: { contains: search, mode: 'insensitive' } },
                      { phone: { contains: search, mode: 'insensitive' } },
                      {
                        profile: {
                          displayName: {
                            contains: search,
                            mode: 'insensitive',
                          },
                        },
                      },
                    ],
                  },
                },
              ],
            },
          }
        : {}),
    };

    const [records, total] = await Promise.all([
      this.prisma.meetingParticipant.findMany({
        where,
        skip: options.skip,
        take: options.take,
        orderBy: [{ firstJoinTime: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          meetingId: true,
          firstJoinTime: true,
          lastLeaveTime: true,
          totalDurationSeconds: true,
          ptUser: {
            select: {
              id: true,
              platform: true,
              displayName: true,
              avatarUrl: true,
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                  countryCode: true,
                  phone: true,
                  profile: {
                    select: {
                      displayName: true,
                      avatar: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.meetingParticipant.count({ where }),
    ]);

    return {
      records: records.map((record) => {
        const commonFields = {
          id: record.id,
          meetingId: record.meetingId,
          firstJoinTime: record.firstJoinTime,
          lastLeaveTime: record.lastLeaveTime,
          totalDurationSeconds: record.totalDurationSeconds,
        };
        const { ptUser } = record;
        if (!ptUser) {
          return { ...commonFields, platformUser: null, user: null };
        }

        const { user, ...platformUser } = ptUser;
        return { ...commonFields, platformUser, user };
      }),
      total,
    };
  }
}
