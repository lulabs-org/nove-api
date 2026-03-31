import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiHeader,
  ApiConsumes,
  ApiProduces,
} from '@nestjs/swagger';
import { LoginDto } from '../../dto/login.dto';
import { AuthResponseDto } from '../../dto/auth-response.dto';

export function ApiLoginDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '用户登录',
      description:
        '支持多种登录方式：用户名密码、邮箱密码、手机密码、邮箱验证码、手机验证码。根据不同的登录类型提供相应的参数。',
      tags: ['Auth'],
    }),
    ApiConsumes('application/json'),
    ApiProduces('application/json'),
    ApiResponse({
      status: 200,
      description: '登录成功，返回访问令牌和用户信息',
      type: AuthResponseDto,
      examples: {
        success: {
          summary: '登录成功示例',
          value: {
            accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            user: {
              id: '123e4567-e89b-12d3-a456-426614174000',
              username: 'testuser',
              email: 'user@example.com',
              phone: '13800138000',
              countryCode: '+86',
              createdAt: '2024-01-01T00:00:00.000Z',
            },
          },
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: '认证失败，用户名/密码错误或验证码无效',
      schema: {
        example: {
          statusCode: 401,
          message: '用户名或密码错误',
          error: 'Unauthorized',
        },
      },
    }),
    ApiResponse({
      status: 429,
      description: '登录尝试过于频繁，请稍后再试',
      schema: {
        example: {
          statusCode: 429,
          message: '登录尝试过于频繁，请5分钟后再试',
          error: 'Too Many Requests',
        },
      },
    }),
    ApiResponse({
      status: 404,
      description: '用户不存在',
      schema: {
        example: {
          statusCode: 404,
          message: '用户不存在',
          error: 'Not Found',
        },
      },
    }),
    ApiBody({
      type: LoginDto,
      description: '登录请求参数',
      examples: {
        username_password: {
          summary: '用户名密码登录',
          description: '使用用户名和密码进行登录',
          value: {
            type: 'username_password',
            username: 'testuser',
            password: 'password123',
          },
        },
        email_password: {
          summary: '邮箱密码登录',
          description: '使用邮箱和密码进行登录',
          value: {
            type: 'email_password',
            email: 'user@example.com',
            password: 'password123',
          },
        },
        phone_password: {
          summary: '手机密码登录',
          description: '使用手机号和密码进行登录',
          value: {
            type: 'phone_password',
            phone: '13800138000',
            countryCode: '+86',
            password: 'password123',
          },
        },
        email_code: {
          summary: '邮箱验证码登录',
          description: '使用邮箱验证码进行登录',
          value: {
            type: 'email_code',
            email: 'user@example.com',
            code: '123456',
          },
        },
        phone_code: {
          summary: '手机验证码登录',
          description: '使用手机验证码进行登录',
          value: {
            type: 'phone_code',
            phone: '13800138000',
            countryCode: '+86',
            code: '123456',
          },
        },
      },
    }),
    ApiHeader({
      name: 'Content-Type',
      description: '请求内容类型',
      required: true,
      schema: {
        type: 'string',
        default: 'application/json',
      },
    }),
    ApiHeader({
      name: 'User-Agent',
      description: '用户代理信息',
      required: false,
      schema: {
        type: 'string',
        example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    }),
  );
}
