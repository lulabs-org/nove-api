import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OAuthClient,
  OAuthClientStatus,
  OAuthClientType,
  Prisma,
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

import { PrismaService } from '@/prisma/prisma.service';
import {
  CreateOAuthClientDto,
  QueryOAuthClientsDto,
  UpdateOAuthClientDto,
} from './dto';

const OAUTH_GRANTS = ['authorization_code', 'refresh_token'];

@Injectable()
export class OAuthClientAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: QueryOAuthClientsDto) {
    const where: Prisma.OAuthClientWhereInput = {
      clientType: query.clientType,
      status: query.status,
    };
    const keyword = query.keyword?.trim();
    if (keyword) {
      where.OR = [
        { name: { contains: keyword, mode: 'insensitive' } },
        { clientId: { contains: keyword, mode: 'insensitive' } },
      ];
    }
    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await Promise.all([
      this.prisma.oAuthClient.findMany({
        where,
        skip,
        take: query.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.oAuthClient.count({ where }),
    ]);
    return {
      items: items.map((client) => this.toDto(client)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async getById(id: string) {
    return this.toDto(await this.requireClient(id));
  }

  async listDelegatableScopes() {
    return this.prisma.permission.findMany({
      where: { active: true, oauthDelegatable: true },
      select: {
        code: true,
        name: true,
        resource: true,
        action: true,
        description: true,
      },
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });
  }

  async create(dto: CreateOAuthClientDto, actorUserId: string) {
    const redirectUris = this.validateRedirectUris(dto.redirectUris);
    const scopes = await this.validateScopes(dto.scopes);
    const clientSecret =
      dto.clientType === OAuthClientType.CONFIDENTIAL
        ? crypto.randomBytes(32).toString('base64url')
        : undefined;
    const client = await this.prisma.$transaction(async (tx) => {
      const created = await tx.oAuthClient.create({
        data: {
          clientId: crypto.randomBytes(32).toString('hex'),
          clientSecret: clientSecret
            ? await bcrypt.hash(clientSecret, 10)
            : null,
          clientType: dto.clientType,
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          logoUri: dto.logoUri?.trim() || null,
          redirectUris,
          scopes,
          grants: OAUTH_GRANTS,
          createdBy: actorUserId,
          updatedBy: actorUserId,
        },
      });
      await this.audit(tx, created.id, actorUserId, 'CREATE', {
        clientType: created.clientType,
        scopes: created.scopes,
        redirectUris: created.redirectUris,
      });
      return created;
    });
    return { ...this.toDto(client), ...(clientSecret ? { clientSecret } : {}) };
  }

  async update(id: string, dto: UpdateOAuthClientDto, actorUserId: string) {
    const existing = await this.requireMutableClient(id);
    const scopes = dto.scopes
      ? await this.validateScopes(dto.scopes)
      : existing.scopes;
    const redirectUris = dto.redirectUris
      ? this.validateRedirectUris(dto.redirectUris)
      : existing.redirectUris;
    const scopesChanged = !this.sameSet(scopes, existing.scopes);
    const client = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.oAuthClient.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          description:
            dto.description === undefined
              ? undefined
              : dto.description.trim() || null,
          logoUri:
            dto.logoUri === undefined ? undefined : dto.logoUri.trim() || null,
          redirectUris,
          scopes,
          updatedBy: actorUserId,
          credentialVersion: scopesChanged ? { increment: 1 } : undefined,
        },
      });
      if (scopesChanged) await this.revokeRefreshTokens(tx, existing.clientId);
      await this.audit(tx, id, actorUserId, 'UPDATE', {
        changedFields: Object.keys(dto),
        scopesChanged,
      });
      return updated;
    });
    return this.toDto(client);
  }

  async disable(id: string, actorUserId: string) {
    const existing = await this.requireMutableClient(id);
    if (existing.status === OAuthClientStatus.DISABLED)
      return this.toDto(existing);
    const now = new Date();
    const client = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.oAuthClient.update({
        where: { id },
        data: {
          status: OAuthClientStatus.DISABLED,
          disabledAt: now,
          credentialVersion: { increment: 1 },
          updatedBy: actorUserId,
        },
      });
      await Promise.all([
        this.revokeRefreshTokens(tx, existing.clientId),
        tx.oAuthAuthCode.deleteMany({ where: { clientId: existing.clientId } }),
        tx.oAuthAuthorizationRequest.updateMany({
          where: { clientId: existing.clientId, consumedAt: null },
          data: { consumedAt: now },
        }),
      ]);
      await this.audit(tx, id, actorUserId, 'DISABLE');
      return updated;
    });
    return this.toDto(client);
  }

  async enable(id: string, actorUserId: string) {
    const existing = await this.requireMutableClient(id);
    if (existing.status === OAuthClientStatus.ACTIVE)
      return this.toDto(existing);
    const client = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.oAuthClient.update({
        where: { id },
        data: {
          status: OAuthClientStatus.ACTIVE,
          disabledAt: null,
          updatedBy: actorUserId,
        },
      });
      await this.audit(tx, id, actorUserId, 'ENABLE');
      return updated;
    });
    return this.toDto(client);
  }

  async rotateSecret(id: string, actorUserId: string) {
    const existing = await this.requireMutableClient(id);
    if (existing.clientType !== OAuthClientType.CONFIDENTIAL) {
      throw new BadRequestException(
        'Public OAuth clients do not have a secret',
      );
    }
    const clientSecret = crypto.randomBytes(32).toString('base64url');
    const rotatedAt = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.oAuthClient.update({
        where: { id },
        data: {
          clientSecret: await bcrypt.hash(clientSecret, 10),
          updatedBy: actorUserId,
        },
      });
      await this.revokeRefreshTokens(tx, existing.clientId);
      await this.audit(tx, id, actorUserId, 'ROTATE_SECRET');
    });
    return { clientSecret, rotatedAt };
  }

  private validateRedirectUris(values: string[]) {
    const normalized = [...new Set(values.map((value) => value.trim()))];
    for (const value of normalized) {
      let url: URL;
      try {
        url = new URL(value);
      } catch {
        throw new BadRequestException(`Invalid redirect URI: ${value}`);
      }
      if (value.includes('*') || url.hash || url.username || url.password) {
        throw new BadRequestException(`Unsafe redirect URI: ${value}`);
      }
      const isLoopback =
        url.protocol === 'http:' && url.hostname === '127.0.0.1';
      const allowDevelopmentHttp =
        process.env.NODE_ENV !== 'production' && url.protocol === 'http:';
      if (url.protocol !== 'https:' && !isLoopback && !allowDevelopmentHttp) {
        throw new BadRequestException(`Redirect URI must use HTTPS: ${value}`);
      }
    }
    return normalized;
  }

  private async validateScopes(values: string[]) {
    const scopes = [
      ...new Set(values.map((value) => value.trim()).filter(Boolean)),
    ];
    const permissions = await this.prisma.permission.findMany({
      where: { code: { in: scopes }, active: true, oauthDelegatable: true },
      select: { code: true },
    });
    const allowed = new Set(permissions.map(({ code }) => code));
    const invalid = scopes.filter((scope) => !allowed.has(scope));
    if (invalid.length) {
      throw new BadRequestException(
        `Scopes are not OAuth delegatable: ${invalid.join(', ')}`,
      );
    }
    return scopes;
  }

  private async requireClient(id: string) {
    const client = await this.prisma.oAuthClient.findUnique({ where: { id } });
    if (!client) throw new NotFoundException('OAuth client not found');
    return client;
  }

  private async requireMutableClient(id: string) {
    const client = await this.requireClient(id);
    if (client.isSystem) {
      throw new ForbiddenException('System OAuth clients are read-only');
    }
    return client;
  }

  private revokeRefreshTokens(tx: Prisma.TransactionClient, clientId: string) {
    return tx.oAuthToken.updateMany({
      where: { clientId, revoked: false },
      data: { revoked: true, revokedAt: new Date() },
    });
  }

  private audit(
    tx: Prisma.TransactionClient,
    oauthClientId: string,
    actorUserId: string,
    action: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    return tx.oAuthClientAuditLog.create({
      data: { oauthClientId, actorUserId, action, metadata },
    });
  }

  private sameSet(first: string[], second: string[]) {
    return (
      first.length === second.length &&
      first.every((value) => second.includes(value))
    );
  }

  private toDto(client: OAuthClient) {
    return {
      id: client.id,
      clientId: client.clientId,
      clientType: client.clientType,
      status: client.status,
      isSystem: client.isSystem,
      name: client.name,
      description: client.description,
      logoUri: client.logoUri,
      redirectUris: client.redirectUris,
      grants: client.grants,
      scopes: client.scopes,
      credentialVersion: client.credentialVersion,
      disabledAt: client.disabledAt,
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    };
  }
}
