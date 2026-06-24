import { Injectable, Inject, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { jwtConfig } from '@/configs/jwt.config';
import { ConfigType } from '@nestjs/config';
import * as crypto from 'crypto';
import { randomUUID } from 'crypto';

@Injectable()
export class OAuthGrantService {
  private readonly logger = new Logger(OAuthGrantService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    @Inject(jwtConfig.KEY)
    private readonly config: ConfigType<typeof jwtConfig>,
  ) {}

  /**
   * 生成授权码
   */
  async createAuthorizationCode(
    clientId: string,
    userId: string,
    redirectUri: string,
    scopes: string[] = [],
  ): Promise<string> {
    const code = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 分钟有效期

    await this.prisma.oAuthAuthCode.create({
      data: {
        code,
        clientId,
        userId,
        redirectUri,
        scopes,
        expiresAt,
      },
    });

    return code;
  }

  /**
   * 授权码换取 Token
   */
  async exchangeCodeForTokens(
    clientId: string,
    code: string,
    redirectUri?: string,
  ) {
    const authCode = await this.prisma.oAuthAuthCode.findUnique({
      where: { code },
    });

    if (!authCode) {
      throw new BadRequestException('Invalid authorization code');
    }

    if (authCode.clientId !== clientId) {
      throw new BadRequestException('Client mismatch');
    }

    if (redirectUri && authCode.redirectUri !== redirectUri) {
      throw new BadRequestException('Redirect URI mismatch');
    }

    if (new Date() > authCode.expiresAt) {
      await this.prisma.oAuthAuthCode.delete({ where: { code } });
      throw new BadRequestException('Authorization code expired');
    }

    // 授权码只能使用一次
    await this.prisma.oAuthAuthCode.delete({ where: { code } });

    return this.generateTokens(authCode.userId, clientId, authCode.scopes);
  }

  /**
   * 刷新 Token
   */
  async refreshTokens(clientId: string, refreshToken: string) {
    const tokenRecord = await this.prisma.oAuthToken.findUnique({
      where: { refreshToken },
    });

    if (!tokenRecord || tokenRecord.revoked) {
      throw new UnauthorizedException('Invalid or revoked refresh token');
    }

    if (tokenRecord.clientId !== clientId) {
      throw new BadRequestException('Client mismatch');
    }

    if (new Date() > tokenRecord.expiresAt) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // 撤销旧的 Refresh Token
    await this.prisma.oAuthToken.update({
      where: { refreshToken },
      data: { revoked: true },
    });

    return this.generateTokens(
      tokenRecord.userId,
      clientId,
      tokenRecord.scopes,
    );
  }

  private async generateTokens(userId: string, clientId: string, scopes: string[]) {
    // 1. 生成 Access Token (JWT)
    const payload = { sub: userId, scopes }; // 包含 scopes
    const accessJti = randomUUID();
    
    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.accessSecret,
      expiresIn: this.config.accessExpiresIn,
      jwtid: accessJti,
    });

    // 2. 生成 Refresh Token 并存入数据库
    const refreshToken = crypto.randomBytes(64).toString('hex');
    
    // 解析 refreshExpiresIn 字符串为毫秒（为了简单起见，这里假设它以 "d", "h" 等结尾）
    // 或者可以直接使用一个固定时间，比如 30 天
    const refreshExpiresInSeconds = 30 * 24 * 60 * 60; // 30 days
    const expiresAt = new Date(Date.now() + refreshExpiresInSeconds * 1000);

    await this.prisma.oAuthToken.create({
      data: {
        refreshToken,
        clientId,
        userId,
        scopes,
        expiresAt,
      },
    });

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600, // 假设 1 小时，实际应从配置中计算
      refresh_token: refreshToken,
      scope: scopes.join(' '),
    };
  }
}
