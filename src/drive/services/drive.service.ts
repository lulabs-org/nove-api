import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DriveAction,
  DriveAuditAction,
  DriveFileManagedBy,
  DrivePrincipalType,
  DriveSpaceType,
  FileBindingTargetType,
  FileVersionStatus,
  FileScanProvider,
  UploadSessionStatus,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import {
  OBJECT_STORAGE,
  ObjectStorage,
} from '@/storage/object-storage.interface';
import {
  CompleteUploadSessionDto,
  CreateDriveFolderDto,
  CreateUploadSessionDto,
  DriveNodeDto,
  DriveSpaceDto,
  ListDriveNodesQueryDto,
  MoveDriveNodeDto,
  PutDriveGrantDto,
  SignUploadPartsDto,
  UpdateDriveNodeDto,
} from '../dto';
import { DriveAuthContext, DrivePolicyService } from './drive-policy.service';
import { FilePolicyService } from './file-policy.service';
import { SystemConfigService } from '@/admin/system-config/system-config.service';
import { FileScanService } from '../scanning/file-scan.service';
import {
  DriveAccessRepository,
  DriveFileDetails,
  DriveFileRepository,
  DriveNodeRepository,
  DriveSpaceRepository,
  NodeDtoSource,
  UploadSessionRepository,
} from '../repositories';

@Injectable()
export class DriveService {
  constructor(
    private readonly spaces: DriveSpaceRepository,
    private readonly nodes: DriveNodeRepository,
    private readonly files: DriveFileRepository,
    private readonly uploads: UploadSessionRepository,
    private readonly access: DriveAccessRepository,
    private readonly policy: DrivePolicyService,
    private readonly filePolicy: FilePolicyService,
    private readonly fileScans: FileScanService,
    private readonly systemConfig: SystemConfigService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
  ) {}

  async listSpaces(auth: DriveAuthContext): Promise<DriveSpaceDto[]> {
    const userId = this.policy.requireUserId(auth);
    const spaces = [await this.ensurePersonalSpace(userId)];
    if (auth.orgId) spaces.push(await this.ensureOrgSpace(auth.orgId));
    if (this.policy.isDriveAdmin(auth)) {
      spaces.push(await this.ensureUnassignedSpace());
    }
    return spaces.map((space) => ({
      id: space.id,
      name: space.name,
      type: space.type,
      orgId: space.orgId,
    }));
  }

  async listNodes(
    spaceId: string,
    query: ListDriveNodesQueryDto,
    auth: DriveAuthContext,
  ) {
    const space = await this.findSpace(spaceId);
    await this.policy.assertSpaceAccess(space, auth);
    if (query.parentId) {
      await this.policy.assertParent(
        spaceId,
        query.parentId,
        auth,
        DriveAction.VIEW,
      );
    }
    const items = await this.nodes.listActive({
      spaceId,
      parentId: query.parentId ?? null,
      limit: query.limit,
      cursor: query.cursor,
    });
    const hasNextPage = items.length > query.limit;
    const page = hasNextPage ? items.slice(0, query.limit) : items;
    return {
      items: page.map((item) => this.toNodeDto(item)),
      nextCursor: hasNextPage ? (page.at(-1)?.id ?? null) : null,
    };
  }

  async createFolder(
    dto: CreateDriveFolderDto,
    auth: DriveAuthContext,
  ): Promise<DriveNodeDto> {
    const userId = this.policy.requireUserId(auth);
    const name = this.normalizeNodeName(dto.name);
    await this.policy.assertParent(
      dto.spaceId,
      dto.parentId,
      auth,
      DriveAction.UPLOAD,
    );
    await this.assertNameAvailable(dto.spaceId, dto.parentId ?? null, name);
    try {
      const node = await this.nodes.createFolder({
        spaceId: dto.spaceId,
        parentId: dto.parentId ?? null,
        name,
        createdById: userId,
      });
      await this.audit(
        node.spaceId,
        userId,
        DriveAuditAction.CREATE_FOLDER,
        node.id,
      );
      return this.toNodeDto({ ...node, file: null });
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  async updateNode(
    id: string,
    dto: UpdateDriveNodeDto,
    auth: DriveAuthContext,
  ): Promise<DriveNodeDto> {
    const node = await this.findNode(id);
    if (dto.name !== undefined) {
      await this.policy.assertNodeAction(node, DriveAction.RENAME, auth);
      await this.assertMutable(node);
      await this.assertNameAvailable(
        node.spaceId,
        node.parentId,
        this.normalizeNodeName(dto.name),
        id,
      );
    }
    if (dto.inheritAcl !== undefined) {
      await this.policy.assertNodeAction(node, DriveAction.MANAGE_ACL, auth);
    }
    try {
      const updated = await this.nodes.update(id, {
        name:
          dto.name === undefined ? undefined : this.normalizeNodeName(dto.name),
        inheritAcl: dto.inheritAcl,
      });
      if (dto.name !== undefined) {
        await this.audit(
          node.spaceId,
          this.policy.requireUserId(auth),
          DriveAuditAction.RENAME,
          node.id,
        );
      }
      return this.toNodeDto(updated);
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  async moveNode(
    id: string,
    dto: MoveDriveNodeDto,
    auth: DriveAuthContext,
  ): Promise<DriveNodeDto> {
    const node = await this.findNode(id);
    await this.assertMutable(node);
    await this.policy.assertNodeAction(node, DriveAction.MOVE, auth);
    await this.policy.assertParent(
      node.spaceId,
      dto.parentId,
      auth,
      DriveAction.UPLOAD,
    );
    if (dto.parentId) {
      await this.assertNotDescendant(node.id, dto.parentId);
    }
    await this.assertNameAvailable(
      node.spaceId,
      dto.parentId ?? null,
      node.name,
      node.id,
    );
    try {
      const updated = await this.nodes.update(id, {
        parentId: dto.parentId ?? null,
      });
      await this.audit(
        node.spaceId,
        this.policy.requireUserId(auth),
        DriveAuditAction.MOVE,
        node.id,
      );
      return this.toNodeDto(updated);
    } catch (error) {
      this.rethrowConflict(error);
    }
  }

  async createUploadSession(
    dto: CreateUploadSessionDto,
    auth: DriveAuthContext,
  ) {
    const userId = this.policy.requireUserId(auth);
    const sizeBytes = this.parseSize(dto.sizeBytes);
    const fileName = await this.filePolicy.validateDeclaration(
      dto.fileName,
      dto.contentType,
      sizeBytes,
    );
    const scanProvider = await this.fileScans.resolveProvider(
      this.filePolicy.requiresMalwareScan(fileName),
    );
    if (scanProvider === FileScanProvider.ALIYUN_SAS && !dto.checksumSha256) {
      throw new BadRequestException('该文件需要提供 SHA-256 后才能云端扫描');
    }
    await this.policy.assertParent(
      dto.spaceId,
      dto.parentId,
      auth,
      DriveAction.UPLOAD,
    );
    await this.assertNameAvailable(dto.spaceId, dto.parentId ?? null, fileName);

    const objectKey = `drive/${dto.spaceId}/${randomUUID()}${extname(fileName).toLowerCase()}`;
    const multipart = await this.storage.createMultipartUpload({
      key: objectKey,
      contentType: dto.contentType.toLowerCase(),
    });
    try {
      const session = await this.uploads.create({
        spaceId: dto.spaceId,
        parentId: dto.parentId ?? null,
        createdById: userId,
        fileName,
        declaredContentType: dto.contentType.toLowerCase(),
        declaredSizeBytes: sizeBytes,
        declaredChecksumSha256: dto.checksumSha256,
        scanProvider,
        objectKey,
        providerUploadId: multipart.uploadId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
      return {
        id: session.id,
        expiresAt: session.expiresAt,
        recommendedPartSizeBytes: 16 * 1024 * 1024,
        requiresMalwareScan: scanProvider !== FileScanProvider.POLICY_BYPASS,
      };
    } catch (error) {
      await this.storage.abortMultipartUpload({
        key: objectKey,
        uploadId: multipart.uploadId,
      });
      throw error;
    }
  }

  async signUploadParts(
    id: string,
    dto: SignUploadPartsDto,
    auth: DriveAuthContext,
  ) {
    const session = await this.findUploadSession(id, auth);
    if (session.expiresAt <= new Date()) {
      throw new BadRequestException('上传会话已过期');
    }
    if (
      session.status !== UploadSessionStatus.CREATED &&
      session.status !== UploadSessionStatus.UPLOADING
    ) {
      throw new BadRequestException('当前上传会话状态不允许上传分片');
    }
    const partNumbers = [...new Set(dto.partNumbers)].sort((a, b) => a - b);
    await this.uploads.markUploading(id);
    return {
      parts: partNumbers.map((partNumber) => ({
        partNumber,
        url: this.storage.getUploadPartUrl({
          key: session.objectKey,
          uploadId: session.providerUploadId,
          partNumber,
          expiresSeconds: 15 * 60,
        }),
      })),
    };
  }

  async completeUploadSession(
    id: string,
    dto: CompleteUploadSessionDto,
    auth: DriveAuthContext,
  ): Promise<DriveNodeDto> {
    const session = await this.findUploadSession(id, auth);
    if (
      session.status !== UploadSessionStatus.CREATED &&
      session.status !== UploadSessionStatus.UPLOADING
    ) {
      throw new BadRequestException('当前上传会话不能完成');
    }
    const parts = [...dto.parts]
      .map((part) => ({
        number: part.number,
        etag: part.etag.replace(/^"|"$/g, ''),
      }))
      .sort((a, b) => a.number - b.number);
    if (new Set(parts.map((part) => part.number)).size !== parts.length) {
      throw new BadRequestException('分片编号不能重复');
    }
    await this.assertNameAvailable(
      session.spaceId,
      session.parentId,
      session.fileName,
    );

    let providerCompleted = false;
    let persistedVersionId: string | null = null;
    try {
      await this.storage.completeMultipartUpload({
        key: session.objectKey,
        uploadId: session.providerUploadId,
        parts,
      });
      providerCompleted = true;
      await this.uploads.markVerifying(id, parts);

      const head = await this.storage.headObject(session.objectKey);
      if (BigInt(head.sizeBytes) !== session.declaredSizeBytes) {
        throw new BadRequestException('对象大小与上传声明不一致');
      }
      if (
        head.contentType &&
        head.contentType.split(';', 1)[0].trim().toLowerCase() !==
          session.declaredContentType
      ) {
        throw new BadRequestException('对象 Content-Type 与上传声明不一致');
      }
      const prefix = await this.storage.getObjectBytes(session.objectKey, {
        start: 0,
        end: Math.max(0, Math.min(head.sizeBytes - 1, 65535)),
      });
      this.filePolicy.validateMagic(session.fileName, prefix);

      const userId = this.policy.requireUserId(auth);
      const initialStatus =
        session.scanProvider === FileScanProvider.POLICY_BYPASS
          ? FileVersionStatus.ACTIVE
          : FileVersionStatus.VERIFYING;
      const result = await this.files.createUploadedFileGraph({
        uploadSessionId: id,
        spaceId: session.spaceId,
        parentId: session.parentId,
        fileName: session.fileName,
        contentType: session.declaredContentType,
        sizeBytes: session.declaredSizeBytes,
        checksumSha256: session.declaredChecksumSha256,
        scanProvider: session.scanProvider,
        objectKey: session.objectKey,
        storageProvider: this.storage.getProvider(),
        bucket: this.storage.getBucket(),
        userId,
        initialStatus,
      });
      persistedVersionId = result.versionId;
      if (initialStatus === FileVersionStatus.VERIFYING) {
        await this.fileScans.enqueue(result.versionId);
      }
      return this.toNodeDto(result.node);
    } catch (error) {
      if (persistedVersionId) {
        await this.fileScans.markFailed(persistedVersionId, error);
        throw error;
      }
      await this.uploads.markRejected(id);
      if (providerCompleted) {
        await this.storage
          .deleteObject(session.objectKey)
          .catch(() => undefined);
      }
      this.rethrowConflict(error);
    }
  }

  async abortUploadSession(id: string, auth: DriveAuthContext): Promise<void> {
    const session = await this.findUploadSession(id, auth);
    if (session.status === UploadSessionStatus.ACTIVE) {
      throw new ConflictException('已完成的上传不能中止');
    }
    await this.storage
      .abortMultipartUpload({
        key: session.objectKey,
        uploadId: session.providerUploadId,
      })
      .catch(() => undefined);
    if (session.status === UploadSessionStatus.REJECTED) {
      await this.storage.deleteObject(session.objectKey).catch(() => undefined);
    }
    await this.uploads.markExpired(id);
  }

  async getFile(fileId: string, auth: DriveAuthContext) {
    const record = await this.findFile(fileId);
    await this.policy.assertNodeAction(record.node!, DriveAction.VIEW, auth);
    await this.assertBusinessAccess(record, auth);
    const version = record.versions[0];
    if (!version) throw new NotFoundException('文件版本不存在');
    return {
      id: record.id,
      node: this.toNodeDto({ ...record.node!, file: record }),
      version: {
        id: version.id,
        version: version.version,
        contentType: version.contentType,
        sizeBytes: version.sizeBytes.toString(),
        checksumSha256: version.checksumSha256,
        status: version.status,
      },
    };
  }

  async createDownloadUrl(fileId: string, auth: DriveAuthContext) {
    const record = await this.findFile(fileId);
    await this.policy.assertNodeAction(
      record.node!,
      DriveAction.DOWNLOAD,
      auth,
    );
    await this.assertBusinessAccess(record, auth);
    const version = record.versions[0];
    if (!version || version.status !== FileVersionStatus.ACTIVE) {
      throw new ConflictException('文件尚不可下载');
    }
    await this.audit(
      record.node!.spaceId,
      this.policy.requireUserId(auth),
      DriveAuditAction.DOWNLOAD,
      record.node!.id,
      record.id,
    );
    const raw = (await this.systemConfig.getConfig('drive')) as
      | { value?: Record<string, unknown> }
      | Record<string, unknown>
      | null;
    const config = (raw?.value ?? raw ?? {}) as {
      downloadUrlExpiresSeconds?: number;
    };
    const expiresSeconds = config.downloadUrlExpiresSeconds ?? 10 * 60;
    return {
      url: this.storage.getDownloadUrl({
        key: version.storageObject.objectKey,
        fileName: record.node!.name,
        contentType: version.contentType,
        expiresSeconds,
      }),
      expiresInSeconds: expiresSeconds,
      contentDisposition: 'attachment',
    };
  }

  async listBindings(fileId: string, auth: DriveAuthContext) {
    const record = await this.findFile(fileId);
    await this.policy.assertNodeAction(record.node!, DriveAction.VIEW, auth);
    return record.bindings.map((binding) => ({
      id: binding.id,
      targetType: binding.targetType,
      targetId: binding.targetId,
      fieldKey: binding.fieldKey,
      purpose: binding.purpose,
      active: binding.active,
    }));
  }

  async listGrants(nodeId: string, auth: DriveAuthContext) {
    const node = await this.findNode(nodeId);
    await this.policy.assertNodeAction(node, DriveAction.MANAGE_ACL, auth);
    return this.access.listNodeGrants(nodeId);
  }

  async listSpaceGrants(spaceId: string, auth: DriveAuthContext) {
    const space = await this.findSpace(spaceId);
    await this.policy.assertSpaceAccess(space, auth);
    if (
      !this.policy.isDriveAdmin(auth) &&
      !auth.permissions.includes('drive:manage-acl')
    )
      throw new ForbiddenException('无权管理空间授权');
    return this.access.listSpaceGrants(spaceId);
  }

  async putSpaceGrant(
    spaceId: string,
    dto: PutDriveGrantDto,
    auth: DriveAuthContext,
  ) {
    await this.listSpaceGrants(spaceId, auth);
    await this.validatePrincipal(spaceId, dto);
    return this.access.upsertGrant({
      spaceId,
      nodeId: null,
      principalType: dto.principalType,
      principalId: dto.principalId,
      effect: dto.effect,
      actions: dto.actions,
      createdById: this.policy.requireUserId(auth),
    });
  }

  async deleteSpaceGrant(
    spaceId: string,
    grantId: string,
    auth: DriveAuthContext,
  ) {
    await this.listSpaceGrants(spaceId, auth);
    const result = await this.access.deleteSpaceGrant(spaceId, grantId);
    if (!result.count) throw new NotFoundException('授权记录不存在');
  }

  async listAuditLogs(nodeId: string, auth: DriveAuthContext) {
    const node = await this.findNode(nodeId);
    await this.policy.assertNodeAction(node, DriveAction.VIEW, auth);
    return this.access.listAuditLogs(nodeId, node.fileId);
  }

  async putGrant(
    nodeId: string,
    dto: PutDriveGrantDto,
    auth: DriveAuthContext,
  ) {
    const node = await this.findNode(nodeId);
    await this.policy.assertNodeAction(node, DriveAction.MANAGE_ACL, auth);
    await this.validatePrincipal(node.spaceId, dto);
    const grant = await this.access.upsertGrant({
      spaceId: node.spaceId,
      nodeId,
      principalType: dto.principalType,
      principalId: dto.principalId,
      effect: dto.effect,
      actions: dto.actions,
      createdById: this.policy.requireUserId(auth),
    });
    await this.audit(
      node.spaceId,
      this.policy.requireUserId(auth),
      DriveAuditAction.GRANT,
      node.id,
    );
    return grant;
  }

  async deleteGrant(
    nodeId: string,
    grantId: string,
    auth: DriveAuthContext,
  ): Promise<void> {
    const node = await this.findNode(nodeId);
    await this.policy.assertNodeAction(node, DriveAction.MANAGE_ACL, auth);
    const result = await this.access.deleteNodeGrant(nodeId, grantId);
    if (!result.count) throw new NotFoundException('授权记录不存在');
    await this.audit(
      node.spaceId,
      this.policy.requireUserId(auth),
      DriveAuditAction.REVOKE,
      node.id,
    );
  }

  async trashNode(id: string, auth: DriveAuthContext): Promise<void> {
    const node = await this.findNode(id);
    await this.assertMutable(node);
    await this.policy.assertNodeAction(node, DriveAction.DELETE, auth);
    const ids = await this.getSubtreeIds(id);
    const bindingCount = await this.files.countActiveBindingsForNodes(ids);
    if (bindingCount) throw new ConflictException('文件仍被业务实体引用');
    const now = new Date();
    const raw = (await this.systemConfig.getConfig('drive')) as
      | { value?: Record<string, unknown> }
      | Record<string, unknown>
      | null;
    const config = (raw?.value ?? raw ?? {}) as {
      recycleRetentionDays?: number;
    };
    const retentionDays = config.recycleRetentionDays ?? 30;
    await this.nodes.markTrashed(
      ids,
      now,
      new Date(now.getTime() + retentionDays * 24 * 60 * 60 * 1000),
    );
    await this.audit(
      node.spaceId,
      this.policy.requireUserId(auth),
      DriveAuditAction.TRASH,
      node.id,
    );
  }

  async restoreNode(id: string, auth: DriveAuthContext): Promise<void> {
    const node = await this.nodes.findById(id);
    if (!node || !node.deletedAt)
      throw new NotFoundException('回收站项目不存在');
    await this.policy.assertNodeAction(node, DriveAction.DELETE, auth);
    if (node.parentId) {
      const parent = await this.nodes.findActiveParent(node.parentId);
      if (!parent) throw new ConflictException('原父文件夹已被删除');
    }
    await this.assertNameAvailable(node.spaceId, node.parentId, node.name, id);
    const ids = await this.getSubtreeIds(id, true);
    await this.nodes.restore(ids);
    await this.audit(
      node.spaceId,
      this.policy.requireUserId(auth),
      DriveAuditAction.RESTORE,
      node.id,
    );
  }

  async listTrash(spaceId: string, auth: DriveAuthContext) {
    const space = await this.findSpace(spaceId);
    await this.policy.assertSpaceAccess(space, auth);
    const nodes = await this.nodes.listTrash(spaceId);
    return { items: nodes.map((node) => this.toNodeDto(node)) };
  }

  private async ensurePersonalSpace(userId: string) {
    return this.spaces.ensurePersonal(userId);
  }

  private async ensureOrgSpace(orgId: string) {
    const space = await this.spaces.ensureOrganization(orgId);
    if (!space) throw new ForbiddenException('当前组织不存在');
    return space;
  }

  private async ensureUnassignedSpace() {
    return this.spaces.ensureUnassigned();
  }

  private async findSpace(id: string) {
    const space = await this.spaces.findActiveById(id);
    if (!space) throw new NotFoundException('空间不存在');
    return space;
  }

  private async findNode(id: string) {
    const node = await this.nodes.findActiveById(id);
    if (!node) throw new NotFoundException('文件不存在');
    return node;
  }

  private async findFile(id: string) {
    const file = await this.files.findDetails(id);
    if (!file?.node || file.node.deletedAt)
      throw new NotFoundException('文件不存在');
    return file;
  }

  private async findUploadSession(id: string, auth: DriveAuthContext) {
    const session = await this.uploads.findById(id);
    if (!session) throw new NotFoundException('上传会话不存在');
    if (
      session.createdById !== this.policy.requireUserId(auth) &&
      !this.policy.isDriveAdmin(auth)
    ) {
      throw new ForbiddenException('无权访问该上传会话');
    }
    const space = await this.findSpace(session.spaceId);
    await this.policy.assertSpaceAccess(space, auth);
    return session;
  }

  private async assertBusinessAccess(
    file: DriveFileDetails,
    auth: DriveAuthContext,
  ) {
    if (file.managedBy !== DriveFileManagedBy.SYSTEM) return;
    const minuteBindings = file.bindings.filter(
      (binding) => binding.targetType === FileBindingTargetType.MINUTE,
    );
    if (!minuteBindings.length || this.policy.isDriveAdmin(auth)) return;
    if (!auth.permissions.includes('minute:read')) {
      throw new ForbiddenException('无权访问该 Minute 文件');
    }
    const accessible = await this.files.countAccessibleMinutes(
      minuteBindings.map((binding) => binding.targetId),
      auth.orgId,
    );
    if (!accessible) throw new ForbiddenException('无权访问该 Minute 文件');
  }

  private async assertMutable(node: { fileId: string | null }) {
    if (!node.fileId) return;
    const file = await this.files.findManagedBy(node.fileId);
    if (file?.managedBy === DriveFileManagedBy.SYSTEM) {
      throw new ConflictException('系统托管文件不能执行该操作');
    }
  }

  private async validatePrincipal(spaceId: string, dto: PutDriveGrantDto) {
    const space = await this.findSpace(spaceId);
    if (dto.principalType === DrivePrincipalType.ORG) {
      if (!space.orgId || dto.principalId !== space.orgId) {
        throw new BadRequestException('授权组织与空间不匹配');
      }
      return;
    }
    if (dto.principalType === DrivePrincipalType.USER) {
      if (space.type === DriveSpaceType.PERSONAL) {
        const exists = await this.access.countUser(dto.principalId);
        if (!exists) throw new BadRequestException('用户不存在');
        return;
      }
      const exists = await this.access.countOrgMember({
        orgId: space.orgId!,
        userId: dto.principalId,
      });
      if (!exists) throw new BadRequestException('用户不属于当前组织');
      return;
    }
    const count =
      dto.principalType === DrivePrincipalType.ORG_MEMBER
        ? await this.access.countOrgMember({
            id: dto.principalId,
            orgId: space.orgId!,
          })
        : dto.principalType === DrivePrincipalType.DEPARTMENT
          ? await this.access.countDepartment(dto.principalId, space.orgId!)
          : await this.access.countRole(dto.principalId, space.orgId!);
    if (!count) throw new BadRequestException('授权主体不属于当前组织');
  }

  private async assertNameAvailable(
    spaceId: string,
    parentId: string | null,
    name: string,
    excludeId?: string,
  ) {
    const existing = await this.nodes.findNameConflict({
      spaceId,
      parentId,
      name,
      excludeId,
    });
    if (existing) throw new ConflictException('同一目录下已存在同名项目');
  }

  private normalizeNodeName(value: string): string {
    const name = value.trim();
    if (!name || name === '.' || name === '..' || /[\\/\0\r\n]/.test(name)) {
      throw new BadRequestException('名称不合法');
    }
    return name;
  }

  private parseSize(value: string): bigint {
    try {
      if (!/^\d+$/.test(value)) throw new Error();
      return BigInt(value);
    } catch {
      throw new BadRequestException('sizeBytes 必须是正整数字符串');
    }
  }

  private async getSubtreeIds(rootId: string, includeDeleted = false) {
    return this.nodes.collectSubtreeIds(rootId, includeDeleted);
  }

  private async assertNotDescendant(nodeId: string, targetParentId: string) {
    let currentId: string | null = targetParentId;
    const seen = new Set<string>();
    while (currentId) {
      if (currentId === nodeId) {
        throw new BadRequestException('不能将文件夹移动到自身或后代目录');
      }
      if (seen.has(currentId)) {
        throw new ConflictException('目录树存在循环，无法移动');
      }
      seen.add(currentId);
      const current = await this.nodes.findParentId(currentId);
      currentId = current?.parentId ?? null;
    }
  }

  private toNodeDto(node: NodeDtoSource): DriveNodeDto {
    const version = node.file?.versions[0];
    return {
      id: node.id,
      spaceId: node.spaceId,
      parentId: node.parentId,
      type: node.type,
      name: node.name,
      inheritAcl: node.inheritAcl,
      fileId: node.fileId,
      contentType: version?.contentType ?? null,
      sizeBytes: version?.sizeBytes.toString() ?? null,
      fileStatus: version?.status ?? null,
      createdAt: node.createdAt,
      updatedAt: node.updatedAt,
    };
  }

  private audit(
    spaceId: string,
    actorId: string,
    action: DriveAuditAction,
    nodeId?: string,
    fileId?: string,
  ) {
    return this.access.createAudit({
      spaceId,
      actorId,
      action,
      nodeId,
      fileId,
    });
  }

  private rethrowConflict(error: unknown): never {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('同一目录下已存在同名项目');
    }
    throw error;
  }
}
