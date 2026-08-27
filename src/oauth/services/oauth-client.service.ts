import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OAuthClientType } from '@prisma/client';
import { OAuthClientStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

import { PrismaService } from '@/prisma/prisma.service';
import { CreateClientDto } from '../dto/oauth.dto';

@Injectable()
export class OAuthClientService {
  constructor(private readonly prisma: PrismaService) {}

  async createClient(dto: CreateClientDto) {
    const clientId = crypto.randomBytes(16).toString('hex');
    const clientSecret = crypto.randomBytes(32).toString('base64url');
    const client = await this.prisma.oAuthClient.create({
      data: {
        clientId,
        clientSecret: await bcrypt.hash(clientSecret, 10),
        clientType: OAuthClientType.CONFIDENTIAL,
        name: dto.name,
        description: dto.description,
        logoUri: dto.logoUri,
        redirectUris: dto.redirectUris,
        scopes: dto.scopes || [],
        grants: ['authorization_code', 'refresh_token'],
      },
    });

    return {
      id: client.id,
      clientId: client.clientId,
      clientSecret,
      name: client.name,
      redirectUris: client.redirectUris,
    };
  }

  async findClient(clientId: string) {
    const client = await this.prisma.oAuthClient.findUnique({
      where: { clientId },
    });
    if (!client) throw new NotFoundException('OAuth client not found');
    return client;
  }

  async validateClient(clientId: string, clientSecret?: string) {
    const client = await this.findClient(clientId);
    this.requireActive(client.status);
    if (client.clientType === OAuthClientType.PUBLIC) return client;
    if (!clientSecret || !client.clientSecret) {
      throw new BadRequestException('Client credentials are required');
    }
    if (!(await bcrypt.compare(clientSecret, client.clientSecret))) {
      throw new BadRequestException('Invalid client credentials');
    }
    return client;
  }

  async validateRedirectUri(clientId: string, redirectUri: string) {
    const client = await this.findClient(clientId);
    this.requireActive(client.status);
    const matches = client.redirectUris.some((registered) =>
      this.redirectUriMatches(registered, redirectUri),
    );
    if (!matches) throw new BadRequestException('Invalid redirect URI');
    return client;
  }

  validateRequestedScopes(allowedScopes: string[], requestedScopes: string[]) {
    const requested = [...new Set(requestedScopes.filter(Boolean))];
    const invalid = requested.filter((scope) => !allowedScopes.includes(scope));
    if (invalid.length > 0) {
      throw new BadRequestException(
        `Client is not allowed to request scopes: ${invalid.join(', ')}`,
      );
    }
    if (requested.length === 0) {
      throw new BadRequestException('At least one scope is required');
    }
    return requested;
  }

  requireGrant(grants: string[], grant: string) {
    if (!grants.includes(grant)) {
      throw new BadRequestException(`Grant type is not allowed: ${grant}`);
    }
  }

  private requireActive(status: OAuthClientStatus) {
    if (status !== OAuthClientStatus.ACTIVE) {
      throw new BadRequestException('OAuth client is disabled');
    }
  }

  private redirectUriMatches(registeredValue: string, requestedValue: string) {
    let registered: URL;
    let requested: URL;
    try {
      registered = new URL(registeredValue);
      requested = new URL(requestedValue);
    } catch {
      return false;
    }

    const isLoopback =
      registered.protocol === 'http:' && registered.hostname === '127.0.0.1';
    if (!isLoopback) return registered.toString() === requested.toString();

    return (
      requested.protocol === 'http:' &&
      requested.hostname === '127.0.0.1' &&
      requested.pathname === registered.pathname &&
      requested.username === '' &&
      requested.password === '' &&
      requested.search === '' &&
      requested.hash === '' &&
      requested.port !== ''
    );
  }
}
