import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DriveNodeType,
  DriveSpaceType,
  FileBindingTargetType,
  Prisma,
} from '@prisma/client';
import { MeetingRepository } from '../repositories/meeting.repository';
import { MeetingParticipantRepository } from '../repositories/meeting-participant.repository';
import { GetMeetingRecordsParams } from '../types';
import {
  MeetingRecordResponseDto,
  MeetingListItemResponseDto,
  MeetingStatsResponseDto,
  CreateMeetingRecordDto,
  UpdateMeetingRecordDto,
  QueryMeetingParticipantsDto,
  MeetingParticipantListResponseDto,
} from '../dto';
import {
  MeetingRecordNotFoundException,
  MeetingRecordAlreadyExistsException,
} from '../exceptions/meeting.exceptions';
import { PrismaService } from '@/prisma/prisma.service';

const ROOT_SUB_MEETING_ID = '__ROOT__';

/**
 * 核心会议服务
 * 负责协调各平台服务和文件处理器
 */
@Injectable()
export class MeetingService {
  constructor(
    private readonly meetingRepository: MeetingRepository,
    private readonly meetingParticipantRepository: MeetingParticipantRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 获取会议记录列表
   */
  async findMany(
    params: GetMeetingRecordsParams,
    orgId?: string,
  ): Promise<{
    records: MeetingListItemResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.meetingRepository.get({ ...params, orgId });
  }

  /**
   * 获取会议记录详情
   */
  async findById(
    id: string,
    orgId?: string,
  ): Promise<MeetingRecordResponseDto> {
    const record = await this.meetingRepository.findById(id, orgId);
    if (!record) {
      throw new MeetingRecordNotFoundException(id);
    }
    return record;
  }

  async findParticipants(
    id: string,
    query: QueryMeetingParticipantsDto,
    orgId?: string,
  ): Promise<MeetingParticipantListResponseDto> {
    if (!(await this.meetingRepository.exists(id, orgId))) {
      throw new MeetingRecordNotFoundException(id);
    }
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const { records, total } = await this.meetingParticipantRepository.findMany(
      id,
      {
        skip: (page - 1) * limit,
        take: limit,
        search: query.search,
      },
    );

    return {
      data: records,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 创建会议记录
   */
  async create(
    params: CreateMeetingRecordDto,
    orgId: string,
  ): Promise<MeetingRecordResponseDto> {
    // 检查是否已存在
    const existing = await this.meetingRepository.findByPt(
      params.platform,
      params.platformMeetingId,
      ROOT_SUB_MEETING_ID,
    );

    if (existing) {
      throw new MeetingRecordAlreadyExistsException(
        params.platformMeetingId,
        ROOT_SUB_MEETING_ID,
      );
    }

    // 转换DTO到repository数据格式
    const createData = {
      orgId,
      platform: params.platform,
      meetingId: params.platformMeetingId,
      subMeetingId: ROOT_SUB_MEETING_ID,
      title: params.title,
      meetingCode: params.meetingCode || '',
      type: params.type,
      hostId:
        params.hostUserId && params.hostUserId.trim() !== ''
          ? params.hostUserId
          : null,
      startAt: params.actualStartAt ? params.actualStartAt : new Date(),
      endAt: params.endedAt ? params.endedAt : new Date(),
      durationSeconds: params.durationSeconds ?? 0,
      metadata: params.metadata as Prisma.InputJsonValue,
    };

    return this.meetingRepository.create(createData);
  }

  /**
   * 更新会议记录
   */
  async update(
    id: string,
    params: UpdateMeetingRecordDto,
    orgId?: string,
  ): Promise<MeetingRecordResponseDto> {
    const record = await this.meetingRepository.findById(id, orgId);
    if (!record) {
      throw new MeetingRecordNotFoundException(id);
    }

    // 转换DTO到repository数据格式
    const updateData: Record<string, unknown> = {};
    if (params.participantCount !== undefined)
      updateData.participantCount = params.participantCount;

    // 处理其他字段
    if (params.title !== undefined) {
      updateData.title = params.title;
    }
    if (params.meetingCode !== undefined) {
      updateData.meetingCode = params.meetingCode;
    }
    if (params.type !== undefined) {
      updateData.type = params.type;
    }
    if (params.hostUserId !== undefined) {
      updateData.hostId = params.hostUserId;
    }
    if (params.actualStartAt !== undefined) {
      updateData.startAt = params.actualStartAt;
    }
    if (params.endedAt !== undefined) {
      updateData.endAt = params.endedAt;
    }
    if (params.durationSeconds !== undefined) {
      updateData.durationSeconds = params.durationSeconds;
    }
    if (params.metadata !== undefined) {
      updateData.metadata = params.metadata as Prisma.InputJsonValue;
    }

    return this.meetingRepository.update(id, updateData, orgId);
  }

  /**
   * 删除会议记录（软删除）
   */
  async delete(
    id: string,
    orgId?: string,
  ): Promise<MeetingRecordResponseDto & { deletedAt: Date }> {
    const record = await this.meetingRepository.findById(id, orgId);
    if (!record) {
      throw new MeetingRecordNotFoundException(id);
    }
    return this.meetingRepository.softDelete(id, orgId);
  }

  /**
   * 获取会议统计信息
   */
  async getStats(params: {
    startDate?: Date;
    endDate?: Date;
    orgId?: string;
  }): Promise<MeetingStatsResponseDto> {
    return this.meetingRepository.getStats(params);
  }

  requireOrgId(orgId?: string | null): string {
    if (!orgId) {
      throw new ForbiddenException('Current organization is required');
    }
    return orgId;
  }

  async assignOrganization(ids: string[], orgId: string) {
    const org = await this.prisma.org.findUnique({
      where: { id: orgId },
      select: { id: true, deletedAt: true },
    });
    if (!org || org.deletedAt) throw new NotFoundException('组织不存在');
    const space = await this.ensureOrgDriveSpace(orgId, org.id);
    let updated = 0;
    for (const id of [...new Set(ids)]) {
      const changed = await this.prisma.$transaction(async (tx) => {
        const meeting = await tx.meeting.findFirst({
          where: { id, orgId: null, deletedAt: null },
          select: {
            id: true,
            startAt: true,
            createdAt: true,
            minutes: { where: { deletedAt: null }, select: { id: true } },
          },
        });
        if (!meeting) return false;
        const parentId = await this.ensureMeetingDriveFolder(
          tx,
          space.id,
          meeting.id,
          meeting.startAt ?? meeting.createdAt,
        );
        const minuteIds = meeting.minutes.map((minute) => minute.id);
        const bindings = await tx.fileBinding.findMany({
          where: {
            targetType: FileBindingTargetType.MINUTE,
            targetId: { in: minuteIds },
            active: true,
          },
          include: { file: { include: { node: true } } },
        });
        for (const binding of bindings) {
          const node = binding.file.node;
          if (!node || node.spaceId === space.id) continue;
          const conflict = await tx.driveNode.findFirst({
            where: {
              spaceId: space.id,
              parentId,
              deletedAt: null,
              name: { equals: node.name, mode: 'insensitive' },
            },
          });
          const suffix = binding.id.slice(-8);
          const name = conflict
            ? `${node.name.slice(0, 240)}-${suffix}`
            : node.name;
          await tx.driveNode.update({
            where: { id: node.id },
            data: { spaceId: space.id, parentId, name },
          });
        }
        await tx.meeting.update({ where: { id }, data: { orgId } });
        return true;
      });
      if (changed) updated += 1;
    }
    return { updated };
  }

  async listUnassigned() {
    const [meetings, organizations] = await this.prisma.$transaction([
      this.prisma.meeting.findMany({
        where: { orgId: null, deletedAt: null },
        orderBy: [{ startAt: 'desc' }, { createdAt: 'desc' }],
        take: 500,
        select: {
          id: true,
          title: true,
          platform: true,
          meetingId: true,
          startAt: true,
          createdAt: true,
          _count: { select: { minutes: true } },
        },
      }),
      this.prisma.org.findMany({
        where: { active: true, deletedAt: null },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, code: true },
      }),
    ]);
    return { meetings, organizations };
  }

  private async ensureOrgDriveSpace(orgId: string, validOrgId: string) {
    const existing = await this.prisma.driveSpace.findFirst({
      where: { type: DriveSpaceType.ORG, orgId, deletedAt: null },
    });
    if (existing) return existing;
    const org = await this.prisma.org.findUniqueOrThrow({
      where: { id: validOrgId },
    });
    try {
      return await this.prisma.driveSpace.create({
        data: { type: DriveSpaceType.ORG, orgId, name: `${org.name}团队空间` },
      });
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2002'
      )
        throw error;
      return this.prisma.driveSpace.findFirstOrThrow({
        where: { type: DriveSpaceType.ORG, orgId, deletedAt: null },
      });
    }
  }

  private async ensureMeetingDriveFolder(
    tx: Prisma.TransactionClient,
    spaceId: string,
    meetingId: string,
    occurredAt: Date,
  ) {
    const year = String(occurredAt.getUTCFullYear());
    const month = String(occurredAt.getUTCMonth() + 1).padStart(2, '0');
    let parentId: string | null = null;
    for (const name of ['会议资料', year, month, meetingId]) {
      let node: { id: string } | null = await tx.driveNode.findFirst({
        where: {
          spaceId,
          parentId,
          type: DriveNodeType.FOLDER,
          deletedAt: null,
          name: { equals: name, mode: 'insensitive' },
        },
      });
      if (!node) {
        node = await tx.driveNode.create({
          data: { spaceId, parentId, type: DriveNodeType.FOLDER, name },
          select: { id: true },
        });
      }
      parentId = node.id;
    }
    return parentId!;
  }
}
