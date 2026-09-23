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

  // 2. Redoc 增强展示配置
  const redocOptions: RedocOptions = {
    title: 'Nove API',
    logo: {
      url: 'https://redocly.github.io/redoc/petstore-logo.png',
      backgroundColor: '#FFFFFF',
      altText: 'LuLab Logo',
    },
    sortPropsAlphabetically: true,
    hideDownloadButton: false,
    hideHostname: false,
    expandResponses: '200,201',
    requiredPropsFirst: true,
    noAutoAuth: false,
    theme: {
      colors: {
        primary: {
          main: '#006effff',
        },
      },
      typography: {
        fontFamily: 'muli,sans-serif',
        fontSize: '16px',
        lineHeight: '1.5',
        code: {
          fontFamily: 'monospace',
          color: '#e53935',
          backgroundColor: '#f5f5f5',
        },
      },
      sidebar: {
        width: '300px',
        backgroundColor: '#252b36',
        textColor: '#ffffff',
      },
    },
  };

  await RedocModule.setup('docs', app, document, redocOptions);
}
