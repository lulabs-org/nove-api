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
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MailModule } from './mail/mail.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { UnifiedAuthGuard } from '@/auth/guards/unified-auth.guard';
import { PermissionGuard } from '@/permission/guards/permission.guard';
import { PrismaModule } from './prisma/prisma.module';
import { MeetingModule } from './meeting/meeting.module';
import { HookTencentMtgModule } from './tencent-mtg-hook/hook-tencent-mtg.module';
import { TencentMtgModule } from './tencent-mtg/tencent-mtg.module';
import { LarkMeetingModule } from './lark-meeting/lark-meeting.module';
import { VerificationModule } from '@/verification/verification.module';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { AppResolver } from './app.resolver';
import { ScheduleModule } from '@nestjs/schedule';
import { OpenaiModule } from './integrations/openai/openai.module';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import * as basicAuth from 'express-basic-auth';
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
import { WechatShopModule } from './wechat-shop/wechat-shop.module';
import { OrderModule } from './order/order.module';
import { WebhookLogModule } from './webhook-log/webhook-log.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 10,
    }]),
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
    BullBoardModule.forRoot({
      route: '/queues',
      adapter: ExpressAdapter,
      boardOptions: {
        uiConfig: {
          boardTitle: 'Nove Queues',
        },
      },
      middleware: basicAuth({
        challenge: true,
        users: {
          [process.env.BULL_BOARD_USER || 'admin']:
            process.env.BULL_BOARD_PASSWORD || 'changeme',
        },
      }),
    }),
    TasksModule,
    ScheduleModule.forRoot(),
    PrismaModule,
    MailModule,
    AuthModule,
    UserModule,
    MeetingModule,
    HookTencentMtgModule,
    TencentMtgModule,
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
    WechatShopModule,
    OrderModule,
    WebhookLogModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    AppResolver,
    {
      provide: APP_GUARD,
      useClass: UnifiedAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
  ],
})
export class AppModule { }
