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
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MailModule } from './mail/mail.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { UnifiedAuthGuard } from '@/auth/guards/unified-auth.guard';
import { PermissionGuard } from '@/admin/permission/guards/permission.guard';
import { PrismaModule } from './prisma/prisma.module';
import { MeetingModule } from './meeting/meeting.module';
import { MinuteModule } from './minute/minute.module';

import { TMeetModule } from './tmeet/tmeet.module';
import { LarkModule } from './lark/lark.module';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { AppResolver } from './app.resolver';
import { ScheduleModule } from '@nestjs/schedule';
import { LlmModule } from './llm/llm.module';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import * as basicAuth from 'express-basic-auth';
import { redisConfig } from './configs';
import { ApiKeyModule } from './admin/api-key/api-key.module';
import { McpServerModule } from './mcp-server/mcp-server.module';
import { PermissionModule } from './admin/permission/permission.module';
import { TasksModule } from './task/tasks.module';
import { RoleModule } from './admin/role/role.module';
import { OrganizationModule } from './admin/org/organization.module';
import { DepartmentModule } from './admin/dept/department.module';
import { OrgMemberModule } from './admin/org-member/org-member.module';
import { WechatShopModule } from './wechat-shop/wechat-shop.module';
import { OrderModule } from './order/order.module';
import { WebhookLogModule } from './webhook-log/webhook-log.module';
import { OAuthModule } from './oauth/oauth.module';
import { SystemConfigModule } from './admin/system-config/system-config.module';
import { AdminUserModule } from './admin/user/user.module';
import { ProductModule } from './product/product.module';
import { ChannelModule } from './channel/channel.module';
import { OrderRefundModule } from './order-refund/order-refund.module';
import { TrackingReportModule } from './tracking-report/tracking-report.module';
import { OAuthClientAdminModule } from './admin/oauth-client/oauth-client-admin.module';
import { ProjectModule } from './project/project.module';
import { ProfitSharingModule } from './profit-sharing/profit-sharing.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
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
    EventEmitterModule.forRoot(),
    PrismaModule,
    MailModule,
    AuthModule,
    UserModule,
    MeetingModule,
    MinuteModule,

    TMeetModule,
    LarkModule,
    LlmModule,
    ApiKeyModule,
    PermissionModule,
    McpServerModule,
    RoleModule,
    OrganizationModule,
    DepartmentModule,
    OrgMemberModule,
    WechatShopModule,
    OrderModule,
    WebhookLogModule,
    OAuthModule,
    SystemConfigModule,
    AdminUserModule,
    ProductModule,
    ChannelModule,
    OrderRefundModule,
    TrackingReportModule,
    OAuthClientAdminModule,
    ProjectModule,
    ProfitSharingModule,
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
export class AppModule {}
