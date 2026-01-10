/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-11 01:53:34
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-11 01:53:36
 * @FilePath: /nove_api/prisma/seeds/mock/meetings/participants.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { PrismaClient, Prisma } from '@prisma/client';

export interface CreatedParticipants {
  teamMeetingParticipants: Prisma.MeetingParticipantGetPayload<
    Record<string, never>
  >[];
  clientMeetingParticipants: Prisma.MeetingParticipantGetPayload<
    Record<string, never>
  >[];
  trainingMeetingParticipants: Prisma.MeetingParticipantGetPayload<
    Record<string, never>
  >[];
  emergencyMeetingParticipants: Prisma.MeetingParticipantGetPayload<
    Record<string, never>
  >[];
}

export async function createMeetingParticipants(
  prisma: PrismaClient,
  meetings: Record<string, Prisma.MeetingGetPayload<Record<string, never>>>,
  platformUsers: Record<
    string,
    Prisma.PlatformUserGetPayload<Record<string, never>>
  >,
): Promise<CreatedParticipants> {
  const now = new Date();
  const joinTime = new Date(now.getTime() - 1.5 * 60 * 60 * 1000);
  const leftTime = new Date(now.getTime() - 0.5 * 60 * 60 * 1000);
  const durationSeconds = Math.floor(
    (leftTime.getTime() - joinTime.getTime()) / 1000,
  );

  const createParticipant = async (
    meetingId: string,
    platformUserId: string,
  ) => {
    return prisma.meetingParticipant.create({
      data: {
        meetingId,
        platformUserId,
        joinTime,
        leftTime,
        durationSeconds,
        userRole: 1,
      },
    });
  };

  const teamMeetingParticipants = await Promise.all([
    createParticipant(meetings.teamMeeting.id, platformUsers.participant1.id),
    createParticipant(meetings.teamMeeting.id, platformUsers.participant2.id),
  ]);

  const clientMeetingParticipants = await Promise.all([
    createParticipant(meetings.clientMeeting.id, platformUsers.participant1.id),
  ]);

  const trainingMeetingParticipants = await Promise.all([
    createParticipant(
      meetings.trainingMeeting.id,
      platformUsers.participant1.id,
    ),
    createParticipant(
      meetings.trainingMeeting.id,
      platformUsers.participant2.id,
    ),
  ]);

  const emergencyMeetingParticipants = await Promise.all([
    createParticipant(
      meetings.emergencyMeeting.id,
      platformUsers.participant1.id,
    ),
  ]);

  return {
    teamMeetingParticipants,
    clientMeetingParticipants,
    trainingMeetingParticipants,
    emergencyMeetingParticipants,
  };
}
