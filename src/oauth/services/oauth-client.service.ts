import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateClientDto } from '../dto/oauth.dto';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class OAuthClientService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建 OAuth 客户端
   */
  async createClient(dto: CreateClientDto) {
    const clientId = this.generateClientId();
    const clientSecret = this.generateClientSecret();
    const hashedSecret = await bcrypt.hash(clientSecret, 10);

    const client = await this.prisma.oAuthClient.create({
      data: {
        clientId,
        clientSecret: hashedSecret,
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
      clientSecret: clientSecret, // 仅在创建时返回一次明文
      name: client.name,
      redirectUris: client.redirectUris,
    };
  }

  /**
   * 验证客户端凭证
   */
  async validateClient(clientId: string, clientSecret: string) {
    const client = await this.prisma.oAuthClient.findUnique({
      where: { clientId },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    const isMatch = await bcrypt.compare(clientSecret, client.clientSecret);
    if (!isMatch) {
      throw new BadRequestException('Invalid client credentials');
    }

    return client;
  }

  /**
   * 验证重定向 URI
   */
  async validateRedirectUri(clientId: string, redirectUri: string) {
    const client = await this.prisma.oAuthClient.findUnique({
      where: { clientId },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    if (!client.redirectUris.includes(redirectUri)) {
      throw new BadRequestException('Invalid redirect URI');
    }

    return client;
  }

  private generateClientId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private generateClientSecret(): string {
    return crypto.randomBytes(32).toString('base64url');
  }
}
