/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-10-01 06:58:19
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-14 02:50:57
 * @FilePath: /nove_api/src/auth/auth.module.ts
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
import { JwtStrategy, JWT_USER_LOOKUP } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { RedisModule } from '@/redis/redis.module';
import { MailModule } from '@/mail/mail.module';
import { UserModule } from '@/user/user.module';
import { VerificationModule } from '@/verification/verification.module';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { LoginLogRepository } from './repositories/login-log.repository';
import { JwtUserLookupService } from './services/jwt-user-lookup.service';
import { TokenBlacklistService } from './services/token-blacklist.service';
import { PermissionModule } from '@/permission/permission.module';
import { jwtConfig } from '@/configs/jwt.config';

@Module({
  imports: [
    ConfigModule.forFeature(jwtConfig),
    RedisModule,
    UserModule,
    VerificationModule,
    PermissionModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: jwtConfig().accessSecret,
      signOptions: {
        expiresIn: jwtConfig().accessExpiresIn,
      },
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
    LocalStrategy,
    RefreshTokenRepository,
    LoginLogRepository,
    { provide: JWT_USER_LOOKUP, useClass: JwtUserLookupService },
    TokenBlacklistService,
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
