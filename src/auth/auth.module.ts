/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-10-01 06:58:19
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-09-04 18:00:00
 * @FilePath: /nove_api/src/auth/auth.module.ts
 * @Description: 认证模块配置与提供者装配
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './controllers/auth.controller';
import { AccountSecurityController } from './controllers/account-security.controller';
import { OtpController } from './controllers/otp.controller';
import { AuthService } from './services/auth.service';
import { TokenService } from './services/token.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JWT_USER_LOOKUP, JWT_TOKEN_BLACKLIST } from './types/jwt.types';
import { RedisModule } from '@/redis/redis.module';
import { MailModule } from '@/mail/mail.module';
import { UserModule } from '@/user/user.module';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { LoginLogRepository } from './repositories/login-log.repository';
import { JwtUserLookupService } from './services/jwt-user-lookup.service';
import { TokenBlacklistService } from './services/token-blacklist.service';
import { jwtConfig } from '@/configs/jwt.config';
import { PermissionModule } from '@/admin/permission/permission.module';
import { UnifiedAuthGuard } from './guards/unified-auth.guard';
import { AccountSecurityService } from './services/account-security.service';
import { SmsModule } from '@/sms/sms.module';
import { SecurityAuditCryptoService } from './services/security-audit-crypto.service';
import { SecurityNotificationOutboxService } from './services/security-notification-outbox.service';
import { OtpService } from './services/otp.service';
import { VerificationCodeRepository } from './repositories/verification-code.repository';

@Module({
  imports: [
    RedisModule,
    UserModule,
    PermissionModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    ConfigModule.forFeature(jwtConfig),
    JwtModule.registerAsync({
      imports: [ConfigModule.forFeature(jwtConfig)],
      useFactory: (cfg: ReturnType<typeof jwtConfig>) => ({
        secret: cfg.accessSecret,
        signOptions: {
          expiresIn: cfg.accessExpiresIn,
        },
      }),
      inject: [jwtConfig.KEY],
    }),
    MailModule,
    SmsModule,
  ],
  controllers: [AuthController, AccountSecurityController, OtpController],
  providers: [
    AuthService,
    TokenService,
    JwtStrategy,
    RefreshTokenRepository,
    LoginLogRepository,
    { provide: JWT_USER_LOOKUP, useClass: JwtUserLookupService },
    TokenBlacklistService,
    { provide: JWT_TOKEN_BLACKLIST, useExisting: TokenBlacklistService },
    UnifiedAuthGuard,
    AccountSecurityService,
    SecurityAuditCryptoService,
    SecurityNotificationOutboxService,
    OtpService,
    VerificationCodeRepository,
  ],
  exports: [AuthService, TokenService, TokenBlacklistService, UnifiedAuthGuard],
})
export class AuthModule {}
