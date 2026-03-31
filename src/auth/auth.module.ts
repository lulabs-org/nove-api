/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-10-01 06:58:19
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-14 10:21:11
 * @FilePath: /lulab_backend/src/auth/auth.module.ts
 * @Description:
 *
 * Copyright (c) 2025 by ${git_name_email}, All Rights Reserved.
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { RegisterService } from './services/register.service';
import { LoginService } from './services/login.service';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { AuthPolicyService } from './services/auth-policy.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JWT_USER_LOOKUP, JWT_TOKEN_BLACKLIST } from './types/jwt.types';
import { RedisModule } from '@/redis/redis.module';
import { MailModule } from '@/mail/mail.module';
import { UserModule } from '@/user/user.module';
import { VerificationModule } from '@/verification/verification.module';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { LoginLogRepository } from './repositories/login-log.repository';
import { JwtUserLookupService } from './services/jwt-user-lookup.service';
import { TokenBlacklistService } from './services/token-blacklist.service';
import { jwtConfig } from '@/configs/jwt.config';
import { PermissionModule } from '@/permission/permission.module';

@Module({
  imports: [
    RedisModule,
    UserModule,
    VerificationModule,
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
  ],
  controllers: [AuthController],
  providers: [
    RegisterService,
    LoginService,
    PasswordService,
    TokenService,
    AuthPolicyService,
    JwtStrategy,
    RefreshTokenRepository,
    LoginLogRepository,
    { provide: JWT_USER_LOOKUP, useClass: JwtUserLookupService },
    TokenBlacklistService,
    { provide: JWT_TOKEN_BLACKLIST, useExisting: TokenBlacklistService },
  ],
  exports: [
    RegisterService,
    LoginService,
    PasswordService,
    TokenService,
    AuthPolicyService,
    TokenBlacklistService,
  ],
})
export class AuthModule {}
