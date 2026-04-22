/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-07-06 05:06:37
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-03-29 20:04:35
 * @FilePath: /nove_api/src/app.module.ts
 * @Description: Application module that defines the application's entry point and dependency injection
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MailModule } from './mail/mail.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { PrismaModule } from './prisma/prisma.module';
import { MeetingModule } from './meeting/meeting.module';
import { HookTencentMtgModule } from './tencent-mtg-hook/hook-tencent-mtg.module';
import { LarkMeetingModule } from './lark-meeting/lark-meeting.module';
import { VerificationModule } from '@/verification/verification.module';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { AppResolver } from './app.resolver';
import { ScheduleModule } from '@nestjs/schedule';
import { OpenaiModule } from './integrations/openai/openai.module';
import { BullModule } from '@nestjs/bullmq';
import { redisConfig } from './configs';
import { ApiKeyModule } from './api-key/api-key.module';
import { McpServerModule } from './mcp-server/mcp-server.module';
import { PermissionModule } from './permission/permission.module';
import { TasksModule } from './task/tasks.module';
import { RoleModule } from './role/role.module';
import { OrganizationModule } from './org/organization.module';
import { DepartmentModule } from './dept/department.module';
import { OrgMemberModule } from './org-member/org-member.module';
import { MeetAiModule } from './meet-ai/meet-ai.module';
import { OrderModule } from './order/order.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      playground: process.env.NODE_ENV !== 'production',
      introspection: process.env.NODE_ENV !== 'production',
    }),
    BullModule.forRoot({
      connection: {
        host: redisConfig().host,
        port: redisConfig().port,
        password: redisConfig().password,
        db: redisConfig().db,
      },
    }),
    TasksModule,
    ScheduleModule.forRoot(),
    PrismaModule,
    MailModule,
    AuthModule,
    UserModule,
    MeetingModule,
    HookTencentMtgModule,
    LarkMeetingModule,
    VerificationModule,
    OpenaiModule,
    ApiKeyModule,
    PermissionModule,
    McpServerModule,
    RoleModule,
    OrganizationModule,
    DepartmentModule,
    OrgMemberModule,
    MeetAiModule,
    OrderModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    AppResolver,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
