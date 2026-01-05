import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@/prisma/prisma.module';
import { apiKeyConfig } from '@/configs/api-key.config';

// Controllers
import { ApiKeyController } from './controllers/api-key.controller';
import { V1Controller } from './controllers/v1.controller';

// Services
import { ApiKeyService } from './services/api-key.service';
import { UsageLogService } from './services/usage-log.service';
import { UserOrganizationService } from './services/user-organization.service';

// Repositories
import { ApiKeyRepository } from './repositories/api-key.repository';
import { UsageLogRepository } from './repositories/usage-log.repository';

// Guards
import { ApiKeyGuard } from './guards/api-key.guard';
import { ApiScopesGuard } from './guards/api-scopes.guard';

// Interceptors
import { UsageLoggingInterceptor } from './interceptors/usage-logging.interceptor';

/**
 * API Key 管理模块
 * 提供 API Key 的创建、管理、认证和使用日志功能
 */
@Module({
  imports: [PrismaModule, ConfigModule.forFeature(apiKeyConfig)],
  controllers: [ApiKeyController, V1Controller],
  providers: [
    // Services
    ApiKeyService,
    UsageLogService,
    UserOrganizationService,

    // Repositories
    ApiKeyRepository,
    UsageLogRepository,

    // Guards
    ApiKeyGuard,
    ApiScopesGuard,

    // Interceptors
    UsageLoggingInterceptor,
  ],
  exports: [
    // 导出服务供其他模块使用
    ApiKeyService,
    UsageLogService,

    // 导出守卫供其他模块使用
    ApiKeyGuard,
    ApiScopesGuard,

    // 导出拦截器供其他模块使用
    UsageLoggingInterceptor,
  ],
})
export class ApiKeyModule {}
