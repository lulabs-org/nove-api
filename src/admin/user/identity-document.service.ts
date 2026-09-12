import { createHmac } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthContext } from '@/auth/types/auth-context.interface';
import { encrypt } from '@/common/utils/crypto.util';
import { DesensitizationUtil } from '@/common/utils/desensitization.util';
import {
  DocumentVerifyStatus,
  DriveAction,
  Prisma,
} from '@/generated/prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { DriveAclService } from '@/drive/policies';
import {
  CreateIdentityDocumentDto,
  IdentityDocumentDto,
  ReviewIdentityDocumentDto,
  UpdateIdentityDocumentDto,
} from './dto';

const identityDocumentSelect = {
  id: true,
  userId: true,
  documentType: true,
  issuingCountry: true,
  holderName: true,
  maskedNumber: true,
  issueDate: true,
  expiryDate: true,
  isPermanent: true,
  issuingAuthority: true,
  metadata: true,
  status: true,
  rejectReason: true,
  verifiedAt: true,
  isPrimary: true,
  createdAt: true,
  updatedAt: true,
  frontFileId: true,
  backFileId: true,
  frontFile: {
    select: {
      fileVersions: {
        take: 1,
        orderBy: { version: 'desc' as const },
        select: {
          fileId: true,
          originalName: true,
          contentType: true,
        },
      },
    },
  },
  backFile: {
    select: {
      fileVersions: {
        take: 1,
        orderBy: { version: 'desc' as const },
        select: {
          fileId: true,
          originalName: true,
          contentType: true,
        },
      },
    },
  },
} satisfies Prisma.UserIdentityDocumentSelect;

type IdentityDocumentRecord = Prisma.UserIdentityDocumentGetPayload<{
  select: typeof identityDocumentSelect;
}>;

interface ResolvedEvidenceFile {
  fileId: string;
  storageObjectId: string;
  nodeId: string;
  spaceId: string;
  name: string;
}

@Injectable()
export class IdentityDocumentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly driveAcl: DriveAclService,
  ) {}

  async list(userId: string): Promise<IdentityDocumentDto[]> {
    await this.assertUserExists(userId);
    const records = await this.prisma.userIdentityDocument.findMany({
      where: { userId, deletedAt: null },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
      select: identityDocumentSelect,
    });
    return records.map((record) => this.toDto(record));
  }

  async create(
    userId: string,
    dto: CreateIdentityDocumentDto,
    auth: AuthContext,
  ): Promise<IdentityDocumentDto> {
    await this.assertUserExists(userId);
    this.validateDates(dto);
    const front = dto.frontDriveFileId
      ? await this.resolveEvidenceFile(dto.frontDriveFileId, auth)
      : null;
    const back = dto.backDriveFileId
      ? await this.resolveEvidenceFile(dto.backDriveFileId, auth)
      : null;
    this.assertDistinctEvidence(front?.storageObjectId, back?.storageObjectId);
    const number = this.normalizeNumber(dto.documentNumber);

    try {
      const record = await this.prisma.$transaction(async (tx) => {
        if (dto.isPrimary) await this.clearPrimary(tx, userId);
        const created = await tx.userIdentityDocument.create({
          data: {
            userId,
            documentType: dto.documentType,
            issuingCountry: dto.issuingCountry,
            holderName: dto.holderName,
            numberCipher: this.encryptNumber(number),
            numberHash: this.hashNumber(number),
            maskedNumber:
              DesensitizationUtil.maskDocument(dto.documentType, number) ??
              '****',
            issueDate: this.date(dto.issueDate),
            expiryDate: dto.isPermanent ? null : this.date(dto.expiryDate),
            isPermanent: dto.isPermanent ?? false,
            issuingAuthority: dto.issuingAuthority ?? null,
            metadata: this.json(dto.metadata),
            isPrimary: dto.isPrimary ?? false,
            frontFileId: front?.storageObjectId,
            backFileId: back?.storageObjectId,
          },
          select: { id: true },
        });
        if (front)
          await this.bindEvidence(
            tx,
            created.id,
            userId,
            'frontFileId',
            front,
            auth,
          );
        if (back)
          await this.bindEvidence(
            tx,
            created.id,
            userId,
            'backFileId',
            back,
            auth,
          );
        return tx.userIdentityDocument.findUniqueOrThrow({
          where: { id: created.id },
          select: identityDocumentSelect,
        });
      });
      return this.toDto(record);
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  async update(
    userId: string,
    documentId: string,
    dto: UpdateIdentityDocumentDto,
    auth: AuthContext,
  ): Promise<IdentityDocumentDto> {
    const current = await this.find(userId, documentId);
    if (current.status === DocumentVerifyStatus.PENDING) {
      throw new BadRequestException('待审核证件不能修改，请先完成审核');
    }
    this.validateDates({
      isPermanent: dto.isPermanent ?? current.isPermanent,
      issueDate: dto.issueDate ?? current.issueDate?.toISOString(),
      expiryDate:
        dto.expiryDate !== undefined
          ? dto.expiryDate
          : current.expiryDate?.toISOString(),
    });
    const front = dto.frontDriveFileId
      ? await this.resolveEvidenceFile(dto.frontDriveFileId, auth, {
          documentId,
          fieldKey: 'frontFileId',
        })
      : null;
    const back = dto.backDriveFileId
      ? await this.resolveEvidenceFile(dto.backDriveFileId, auth, {
          documentId,
          fieldKey: 'backFileId',
        })
      : null;
    this.assertDistinctEvidence(
      dto.frontDriveFileId === undefined
        ? current.frontFileId
        : front?.storageObjectId,
      dto.backDriveFileId === undefined
        ? current.backFileId
        : back?.storageObjectId,
    );
    const number = dto.documentNumber
      ? this.normalizeNumber(dto.documentNumber)
      : null;

    try {
      const record = await this.prisma.$transaction(async (tx) => {
        if (dto.isPrimary) await this.clearPrimary(tx, userId, documentId);
        await tx.userIdentityDocument.update({
          where: { id: documentId },
          data: {
            ...(dto.documentType !== undefined
              ? { documentType: dto.documentType }
              : {}),
            ...(dto.issuingCountry !== undefined
              ? { issuingCountry: dto.issuingCountry }
              : {}),
            ...(dto.holderName !== undefined
              ? { holderName: dto.holderName }
              : {}),
            ...(number
              ? {
                  numberCipher: this.encryptNumber(number),
                  numberHash: this.hashNumber(number),
                  maskedNumber:
                    DesensitizationUtil.maskDocument(
                      dto.documentType ?? current.documentType,
                      number,
                    ) ?? '****',
                }
              : {}),
            ...(dto.issueDate !== undefined
              ? { issueDate: this.date(dto.issueDate) }
              : {}),
            ...(dto.isPermanent !== undefined
              ? {
                  isPermanent: dto.isPermanent,
                  ...(dto.isPermanent ? { expiryDate: null } : {}),
                }
              : {}),
            ...(dto.expiryDate !== undefined && !dto.isPermanent
              ? { expiryDate: this.date(dto.expiryDate) }
              : {}),
            ...(dto.issuingAuthority !== undefined
              ? { issuingAuthority: dto.issuingAuthority }
              : {}),
            ...(dto.metadata !== undefined
              ? { metadata: this.json(dto.metadata) }
              : {}),
            ...(dto.isPrimary !== undefined
              ? { isPrimary: dto.isPrimary }
              : {}),
            ...(dto.frontDriveFileId !== undefined
              ? { frontFileId: front?.storageObjectId ?? null }
              : {}),
            ...(dto.backDriveFileId !== undefined
              ? { backFileId: back?.storageObjectId ?? null }
              : {}),
            status: DocumentVerifyStatus.UNVERIFIED,
            rejectReason: null,
            verifiedAt: null,
          },
        });
        if (dto.frontDriveFileId !== undefined)
          await this.replaceEvidence(
            tx,
            documentId,
            userId,
            'frontFileId',
            front,
            auth,
          );
        if (dto.backDriveFileId !== undefined)
          await this.replaceEvidence(
            tx,
            documentId,
            userId,
            'backFileId',
            back,
            auth,
          );
        return tx.userIdentityDocument.findUniqueOrThrow({
          where: { id: documentId },
          select: identityDocumentSelect,
        });
      });
      return this.toDto(record);
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  async submit(
    userId: string,
    documentId: string,
  ): Promise<IdentityDocumentDto> {
    const current = await this.find(userId, documentId);
    if (
      current.status !== DocumentVerifyStatus.UNVERIFIED &&
      current.status !== DocumentVerifyStatus.REJECTED
    ) {
      throw new BadRequestException('只有草稿或已驳回证件可以提交审核');
    }
    const record = await this.prisma.userIdentityDocument.update({
      where: { id: documentId },
      data: {
        status: DocumentVerifyStatus.PENDING,
        rejectReason: null,
        verifiedAt: null,
      },
      select: identityDocumentSelect,
    });
    return this.toDto(record);
  }

  async review(
    userId: string,
    documentId: string,
    dto: ReviewIdentityDocumentDto,
  ): Promise<IdentityDocumentDto> {
    const current = await this.find(userId, documentId);
    if (current.status !== DocumentVerifyStatus.PENDING) {
      throw new BadRequestException('只有待审核证件可以执行审核');
    }
    if (
      dto.status !== DocumentVerifyStatus.VERIFIED &&
      dto.status !== DocumentVerifyStatus.REJECTED
    ) {
      throw new BadRequestException('审核结果只能是通过或驳回');
    }
    if (dto.status === DocumentVerifyStatus.REJECTED && !dto.rejectReason) {
      throw new BadRequestException('驳回时必须填写原因');
    }
    const record = await this.prisma.$transaction(async (tx) => {
      if (dto.status === DocumentVerifyStatus.VERIFIED && current.isPrimary) {
        await this.clearPrimary(tx, userId, documentId);
      }
      return tx.userIdentityDocument.update({
        where: { id: documentId },
        data: {
          status: dto.status,
          rejectReason:
            dto.status === DocumentVerifyStatus.REJECTED
              ? dto.rejectReason
              : null,
          verifiedAt:
            dto.status === DocumentVerifyStatus.VERIFIED ? new Date() : null,
        },
        select: identityDocumentSelect,
      });
    });
    return this.toDto(record);
  }

  async delete(
    userId: string,
    documentId: string,
    auth: AuthContext,
  ): Promise<void> {
    await this.find(userId, documentId);
    await this.prisma.$transaction(async (tx) => {
      await tx.userIdentityDocument.update({
        where: { id: documentId },
        data: { deletedAt: new Date(), isPrimary: false },
      });
      await this.unbindEvidence(tx, documentId, 'frontFileId', auth.userId);
      await this.unbindEvidence(tx, documentId, 'backFileId', auth.userId);
    });
  }

  private async find(userId: string, documentId: string) {
    const record = await this.prisma.userIdentityDocument.findFirst({
      where: { id: documentId, userId, deletedAt: null },
      select: identityDocumentSelect,
    });
    if (!record) throw new NotFoundException('身份凭证不存在');
    return record;
  }

  private async assertUserExists(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('用户不存在');
  }

  private assertDistinctEvidence(
    frontFileId?: string | null,
    backFileId?: string | null,
  ): void {
    if (frontFileId && frontFileId === backFileId) {
      throw new BadRequestException('证件正面和反面不能使用同一个文件');
    }
  }

  private normalizeNumber(value: string) {
    return value.replace(/\s+/g, '').toUpperCase();
  }

  private secret(purpose: 'encryption' | 'hash') {
    const root = process.env.SYSTEM_ENCRYPTION_KEY;
    if (!root) throw new ForbiddenException('系统敏感数据密钥未配置');
    return `${root}:identity-document:${purpose}:v1`;
  }

  private encryptNumber(value: string) {
    return encrypt(value, this.secret('encryption'));
  }

  private hashNumber(value: string) {
    return createHmac('sha256', this.secret('hash'))
      .update(value)
      .digest('hex');
  }

  private date(value?: string | null) {
    return value ? new Date(`${value.slice(0, 10)}T00:00:00.000Z`) : null;
  }

  private json(value?: Record<string, unknown> | null) {
    return value === null || value === undefined
      ? Prisma.JsonNull
      : (value as Prisma.InputJsonValue);
  }

  private validateDates(dto: {
    issueDate?: string;
    expiryDate?: string | null;
    isPermanent?: boolean;
  }) {
    if (!dto.isPermanent && !dto.expiryDate) {
      throw new BadRequestException('非长期有效证件必须填写到期日期');
    }
    if (
      dto.issueDate &&
      dto.expiryDate &&
      new Date(dto.expiryDate) < new Date(dto.issueDate)
    ) {
      throw new BadRequestException('到期日期不能早于签发日期');
    }
  }

  private async clearPrimary(
    tx: Prisma.TransactionClient,
    userId: string,
    exceptId?: string,
  ) {
    await tx.userIdentityDocument.updateMany({
      where: {
        userId,
        isPrimary: true,
        deletedAt: null,
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
      data: { isPrimary: false },
    });
  }

  private async resolveEvidenceFile(
    fileId: string,
    auth: AuthContext,
    currentBinding?: {
      documentId: string;
      fieldKey: 'frontFileId' | 'backFileId';
    },
  ): Promise<ResolvedEvidenceFile> {
    if (!auth.orgId) throw new BadRequestException('请选择当前组织');
    const file = await this.prisma.driveFile.findUnique({
      where: { id: fileId },
      include: {
        node: { include: { space: true } },
        versions: { orderBy: { version: 'desc' }, take: 1 },
        bindings: { where: { active: true } },
      },
    });
    const node = file?.node;
    const version = file?.versions[0];
    if (
      !node ||
      node.deletedAt ||
      node.space.deletedAt ||
      node.space.type !== 'ORG' ||
      node.space.orgId !== auth.orgId
    ) {
      throw new BadRequestException('证件影印件必须来自当前组织云盘');
    }
    if (
      !version ||
      version.status !== 'ACTIVE' ||
      (!version.contentType.startsWith('image/') &&
        version.contentType !== 'application/pdf')
    ) {
      throw new BadRequestException('请选择已通过安全校验的图片或 PDF');
    }
    await this.driveAcl.assertNodeAction(node, DriveAction.VIEW, auth);
    if (
      file.bindings.some(
        (binding) =>
          !currentBinding ||
          binding.targetType !== 'IDENTITY_DOCUMENT' ||
          binding.targetId !== currentBinding.documentId ||
          binding.fieldKey !== currentBinding.fieldKey,
      )
    ) {
      throw new BadRequestException(
        '该文件已关联其他业务，请上传独立的证件影印件',
      );
    }
    return {
      fileId,
      storageObjectId: version.storageObjectId,
      nodeId: node.id,
      spaceId: node.spaceId,
      name: node.name,
    };
  }

  private async replaceEvidence(
    tx: Prisma.TransactionClient,
    documentId: string,
    userId: string,
    fieldKey: 'frontFileId' | 'backFileId',
    file: ResolvedEvidenceFile | null,
    auth: AuthContext,
  ) {
    await this.unbindEvidence(tx, documentId, fieldKey, auth.userId);
    if (file)
      await this.bindEvidence(tx, documentId, userId, fieldKey, file, auth);
  }

  private async bindEvidence(
    tx: Prisma.TransactionClient,
    documentId: string,
    userId: string,
    fieldKey: 'frontFileId' | 'backFileId',
    file: ResolvedEvidenceFile,
    auth: AuthContext,
  ) {
    let parentId: string | null = null;
    for (const name of ['实名认证资料', userId, documentId]) {
      const folder: { id: string } | null = await tx.driveNode.findFirst({
        where: {
          spaceId: file.spaceId,
          parentId,
          name,
          type: 'FOLDER',
          deletedAt: null,
        },
        select: { id: true },
      });
      const current: { id: string } =
        folder ??
        (await tx.driveNode.create({
          data: {
            spaceId: file.spaceId,
            parentId,
            name,
            type: 'FOLDER',
            createdById: auth.userId,
          },
          select: { id: true },
        }));
      parentId = current.id;
    }
    await tx.driveNode.update({
      where: { id: file.nodeId },
      data: { parentId },
    });
    await tx.driveFile.update({
      where: { id: file.fileId },
      data: { managedBy: 'SYSTEM' },
    });
    const key = {
      fileId: file.fileId,
      targetType: 'IDENTITY_DOCUMENT' as const,
      targetId: documentId,
      fieldKey,
      purpose: 'IDENTITY_EVIDENCE',
    };
    await tx.fileBinding.upsert({
      where: { fileId_targetType_targetId_fieldKey_purpose: key },
      create: key,
      update: { active: true },
    });
    await tx.driveAuditLog.create({
      data: {
        spaceId: file.spaceId,
        nodeId: file.nodeId,
        fileId: file.fileId,
        actorId: auth.userId,
        action: 'BIND',
        metadata: {
          targetType: 'IDENTITY_DOCUMENT',
          targetId: documentId,
          fieldKey,
        },
      },
    });
  }

  private async unbindEvidence(
    tx: Prisma.TransactionClient,
    documentId: string,
    fieldKey: 'frontFileId' | 'backFileId',
    actorId?: string | null,
  ) {
    const bindings = await tx.fileBinding.findMany({
      where: {
        targetType: 'IDENTITY_DOCUMENT',
        targetId: documentId,
        fieldKey,
        active: true,
      },
      include: { file: { include: { node: true } } },
    });
    for (const binding of bindings) {
      await tx.fileBinding.update({
        where: { id: binding.id },
        data: { active: false },
      });
      if (binding.file.node) {
        await tx.driveAuditLog.create({
          data: {
            spaceId: binding.file.node.spaceId,
            nodeId: binding.file.node.id,
            fileId: binding.fileId,
            actorId,
            action: 'UNBIND',
            metadata: {
              targetType: 'IDENTITY_DOCUMENT',
              targetId: documentId,
              fieldKey,
            },
          },
        });
      }
      if (
        !(await tx.fileBinding.count({
          where: { fileId: binding.fileId, active: true },
        }))
      ) {
        await tx.driveFile.update({
          where: { id: binding.fileId },
          data: { managedBy: 'USER' },
        });
      }
    }
  }

  private toDto(record: IdentityDocumentRecord): IdentityDocumentDto {
    const file = (storage: IdentityDocumentRecord['frontFile']) => {
      const version = storage?.fileVersions[0];
      return version
        ? {
            driveFileId: version.fileId,
            name: version.originalName,
            contentType: version.contentType,
          }
        : null;
    };
    return {
      id: record.id,
      userId: record.userId,
      documentType: record.documentType,
      issuingCountry: record.issuingCountry,
      holderName: record.holderName,
      maskedNumber: record.maskedNumber,
      issueDate: record.issueDate,
      expiryDate: record.expiryDate,
      isPermanent: record.isPermanent,
      issuingAuthority: record.issuingAuthority,
      frontFile: file(record.frontFile),
      backFile: file(record.backFile),
      metadata: record.metadata,
      status: record.status,
      rejectReason: record.rejectReason,
      verifiedAt: record.verifiedAt,
      isPrimary: record.isPrimary,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private rethrowConflict(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('该证件已绑定到其他用户或重复登记');
    }
    throw error;
  }
}
