import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { RedocModule, RedocOptions } from 'nestjs-redoc';
import { OAUTH_SCOPES } from '@/oauth/constants/oauth.constants';

/**
 * 初始化 Swagger 及 Redoc API 文档服务
 */
export async function setupSwagger(app: INestApplication): Promise<void> {
  // 1. Swagger / OpenAPI 规范配置
  const config = new DocumentBuilder()
    .setTitle('Nove API')
    .setDescription('Nove API文档')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: '输入 JWT Token (直接输入 token 即可)',
      },
      'bearer', // 安全方案名称
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-api-key',
        in: 'header',
        description: '输入 API Key (以 sk_ 开头，通过 x-api-key 请求头传递)',
      },
      'api-key', // 安全方案名称
    )
    .addOAuth2(
      {
        type: 'oauth2',
        description: 'Nove OAuth 2.0 认证授权（基于 PKCE 授权码模式）',
        flows: {
          authorizationCode: {
            authorizationUrl: '/api/oauth/authorize',
            tokenUrl: '/api/oauth/token',
            refreshUrl: '/api/oauth/token',
            scopes: OAUTH_SCOPES,
          },
        },
      },
      'oauth2',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      initOAuth: {
        usePkceWithAuthorizationCodeGrant: true,
      },
    },
  });

  // 2. Redoc 增强展示与主题配置
  const redocOptions: RedocOptions = {
    title: 'Nove API 文档',
    sortPropsAlphabetically: true,
    requiredPropsFirst: true,
    expandResponses: '200,201',
    pathInMiddlePanel: true,
    hideDownloadButton: false,
    hideHostname: false,
    hideLoading: false,
    nativeScrollbars: true,
    showExtensions: true,
    noAutoAuth: false,
    tagGroups: [
      {
        name: '身份与认证 (Auth & OAuth)',
        tags: ['Auth', 'OAuth', 'Account Security'],
      },
      {
        name: '核心业务与会议 (Meetings & Minutes)',
        tags: [
          'Meetings',
          'Minute',
          'Minute Summary',
          'Minute Speaker Summary',
          'Tracking Report',
          'Tasks',
          'Drive',
          'Skills',
        ],
      },
      {
        name: '用户管理 (Users)',
        tags: ['User', 'Platform Users'],
      },
      {
        name: '管理后台 (Admin - System & Perm)',
        tags: [
          'Admin / Users',
          'Admin / User Identity Documents',
          'Admin / Organizations',
          'Admin / Org Members',
          'Admin / Departments',
          'Admin / Roles',
          'Admin / Permissions',
          'Admin / Data Permission Rules',
          'Admin / API Keys',
          'Admin / OAuth Clients',
        ],
      },
      {
        name: '管理后台 (Admin - Business)',
        tags: [
          'Admin / Projects',
          'Admin / Products',
          'Admin / Channels',
          'Admin / Orders',
          'Admin / Order Refunds',
          'Admin / Profit Sharing Rules',
          'Admin / Profit Sharing Records',
          'Admin / Profit Sharing Payslips',
        ],
      },
      {
        name: '集成与 Webhooks (Integrations)',
        tags: [
          'TMeet',
          'Stripe',
          'Wechat Shop',
          'Mail',
          'Admin / Integrations',
          'Webhooks',
        ],
      },
      {
        name: '系统基础 (System)',
        tags: ['System'],
      },
    ],
    theme: {
      colors: {
        primary: {
          main: '#2563eb',
        },
        success: {
          main: '#10b981',
        },
        warning: {
          main: '#f59e0b',
        },
        error: {
          main: '#ef4444',
        },
        http: {
          get: '#0284c7',
          post: '#16a34a',
          put: '#d97706',
          delete: '#dc2626',
        },
      },
      typography: {
        fontSize: '14px',
        lineHeight: '1.6',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, PingFang SC, Hiragino Sans GB, Microsoft YaHei, sans-serif',
        headings: {
          fontFamily:
            '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, PingFang SC, sans-serif',
          fontWeight: '600',
        },
        code: {
          fontFamily:
            'JetBrains Mono, Fira Code, Menlo, Monaco, Consolas, monospace',
          fontSize: '13px',
          color: '#e11d48',
          backgroundColor: '#f1f5f9',
        },
        links: {
          color: '#2563eb',
          hover: '#1d4ed8',
        },
      },
      sidebar: {
        width: '320px',
        backgroundColor: '#0f172a',
        textColor: '#e2e8f0',
        activeTextColor: '#38bdf8',
      },
      rightPanel: {
        backgroundColor: '#1e293b',
        textColor: '#f8fafc',
      },
    },
  };

  await RedocModule.setup('docs', app, document, redocOptions);
}
