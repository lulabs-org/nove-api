import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiConsumes,
  ApiProduces,
} from '@nestjs/swagger';
import { LogoutResponseDto } from '../../dto/logout-response.dto';

export function ApiLogoutDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '退出登录',
      description:
        '用户退出登录。支持全面的令牌撤销，包括访问令牌和刷新令牌。可选择撤销单个设备或所有设备的令牌。',
      tags: ['Auth'],
    }),
    ApiConsumes('application/json'),
    ApiProduces('application/json'),
    ApiBody({
      description: '登出请求参数（可选）',
      required: false,
      schema: {
        type: 'object',
        properties: {
          refreshToken: {
            type: 'string',
            description: '刷新令牌（可选），用于撤销该刷新令牌',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh...',
          },
          deviceId: {
            type: 'string',
            description: '设备ID（可选），用于撤销特定设备的所有令牌',
            example: 'mobile-app-ios',
          },
          revokeAllDevices: {
            type: 'boolean',
            description: '是否撤销所有设备的令牌（可选）',
            example: false,
          },
        },
        example: {
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh...',
          deviceId: 'mobile-app-ios',
          revokeAllDevices: false,
        },
      },
    }),
    ApiResponse({
      status: 200,
      description: '退出登录成功',
      type: LogoutResponseDto,
      examples: {
        simple_logout: {
          summary: '简单登出',
          value: {
            success: true,
            message: '退出登录成功',
            details: {
              accessTokenRevoked: true,
              refreshTokenRevoked: false,
            },
          },
        },
        comprehensive_logout: {
          summary: '全面登出',
          value: {
            success: true,
            message: '退出登录成功，已撤销所有设备的 3 个令牌',
            details: {
              accessTokenRevoked: true,
              refreshTokenRevoked: true,
              allDevicesLoggedOut: true,
              revokedTokensCount: 3,
            },
          },
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: '未授权，访问令牌无效或已过期',
      schema: {
        example: {
          statusCode: 401,
          message: 'Unauthorized',
          error: 'Unauthorized',
        },
      },
    }),
  );
}
