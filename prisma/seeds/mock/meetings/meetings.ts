import {
  PrismaClient,
  MeetingPlatform,
  MeetingType,
  ProcessingStatus,
  Prisma,
} from '@prisma/client';

type MeetingConfig = Omit<
  Prisma.MeetingUncheckedCreateInput,
  'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'platform' | 'type'
> & {
  platform: MeetingPlatform;
  type: MeetingType;
  hostUserName: string;
  participantCount?: number;
};

type MeetingCreateData = Omit<
  MeetingConfig,
  'hostUserName' | 'participantCount'
>;

const MEETING_CONFIGS: Record<string, MeetingConfig> = {
  teamMeeting: {
    title: 'L5项目例会',
    description: 'L5项目周期性例会，讨论项目进度和技术问题',
    platform: MeetingPlatform.TENCENT_MEETING,
    meetingId: '14828776902617556364',
    meetingCode: '148-287-769',
    type: MeetingType.SCHEDULED,
    hostUserName: '杨仕明',
    participantCount: 15,
    tags: ['项目例会', '研发', 'L5'],
    language: 'zh-CN',
  },
  clientMeeting: {
    title: '陈怡瑞会员对接会',
    description: '会员对应接洽与需求沟通',
    platform: MeetingPlatform.TENCENT_MEETING,
    meetingId: '1366034376294456216',
    meetingCode: '136-603-437',
    type: MeetingType.SCHEDULED,
    hostUserName: '张晨',
    participantCount: 5,
    tags: ['会员对接', '需求沟通'],
    language: 'zh-CN',
  },
  trainingMeeting: {
    title: 'AI俱乐部（level2&level1）',
    description: 'AI俱乐部课程培训与交流',
    platform: MeetingPlatform.TENCENT_MEETING,
    meetingId: '11596879021002786213',
    meetingCode: '115-968-790',
    type: MeetingType.WEBINAR,
    hostUserName: '张晨',
    participantCount: 50,
    tags: ['培训', 'AI俱乐部', '教育'],
    language: 'zh-CN',
  },
  emergencyMeeting: {
    title: '杨仕明的快速会议',
    description: '临时快速会议交流',
    platform: MeetingPlatform.TENCENT_MEETING,
    meetingId: '5228964612202836078',
    meetingCode: '522-896-461',
    type: MeetingType.INSTANT,
    hostUserName: '杨仕明',
    participantCount: 3,
    tags: ['快速会议', '临时沟通'],
    language: 'zh-CN',
  },
};

export interface CreatedMeetings {
  teamMeeting: Prisma.MeetingGetPayload<Record<string, never>>;
  clientMeeting: Prisma.MeetingGetPayload<Record<string, never>>;
  trainingMeeting: Prisma.MeetingGetPayload<Record<string, never>>;
  emergencyMeeting: Prisma.MeetingGetPayload<Record<string, never>>;
}

export async function createMeetings(
  prisma: PrismaClient,
  platformUsers: Record<
    string,
    Prisma.PlatformUserGetPayload<Record<string, never>>
  >,
): Promise<CreatedMeetings> {
  const meetingsRaw = await Promise.all(
    Object.entries(MEETING_CONFIGS).map(async ([key, config]) => {
      const now = new Date();
      const startTime = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const endTime = new Date(now.getTime() - 1 * 60 * 60 * 1000);

      const { meetingId } = config;
      const meetingCreateData: MeetingCreateData = {
        title: config.title,
        description: config.description,
        platform: config.platform,
        meetingId: meetingId,
        meetingCode: config.meetingCode,
        type: config.type,
        tags: config.tags,
        language: config.language,
      };

      let hostUser:
        | Prisma.PlatformUserGetPayload<Record<string, never>>
        | undefined;
      if (key === 'teamMeeting') hostUser = platformUsers.host1;
      else if (key === 'clientMeeting') hostUser = platformUsers.host2;
      else if (key === 'trainingMeeting') hostUser = platformUsers.host3;
      else if (key === 'emergencyMeeting') hostUser = platformUsers.host4;

      const meeting = await prisma.meeting.upsert({
        where: {
          platform_meetingId_subMeetingId: {
            platform: config.platform,
            meetingId: meetingId,
            subMeetingId: '__ROOT__',
          },
        },
        update: {
          ...meetingCreateData,
          hostId: hostUser?.id,
          updatedAt: new Date(),
        },
        create: {
          ...meetingCreateData,
          meetingId: meetingId,
          hostId: hostUser?.id,
          scheduledStartAt: startTime,
          scheduledEndAt: endTime,
          startAt: startTime,
          endAt: endTime,
          durationSeconds: 3600,
          hasRecording: true,
          recordingStatus: ProcessingStatus.COMPLETED,
          processingStatus: ProcessingStatus.COMPLETED,
          timezone: 'Asia/Shanghai',
          subMeetingId: '__ROOT__',
        },
      });
      return { key, meeting };
    }),
  );

  const meetings = meetingsRaw.reduce(
    (acc, { key, meeting }) => {
      acc[key] = meeting;
      return acc;
    },
    {} as Record<string, Prisma.MeetingGetPayload<Record<string, never>>>,
  );

  return meetings as unknown as CreatedMeetings;
}
