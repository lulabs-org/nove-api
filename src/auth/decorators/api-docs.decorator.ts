import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiHeader,
  ApiConsumes,
  ApiProduces,
} from '@nestjs/swagger';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { LogoutResponseDto } from '../dto/logout-response.dto';

// 注册接口文档装饰器
export function ApiRegisterDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '用户注册',
      description:
        '用户注册需要先通过邮箱或手机号验证码验证。支持的注册类型：email_code（邮箱验证码）、phone_code（手机验证码）。为了安全考虑，不再支持纯用户名密码注册。',
      tags: ['Auth'],
    }),
    ApiConsumes('application/json'),
    ApiProduces('application/json'),
    ApiResponse({
      status: 201,
      description: '注册成功，返回访问令牌和用户信息',
      type: AuthResponseDto,
      examples: {
        success: {
          summary: '注册成功示例',
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
      status: 400,
      description: '请求参数错误或使用了不支持的注册方式',
      schema: {
        example: {
          statusCode: 400,
          message: ['邮箱格式不正确', '密码必须包含至少一个字母和一个数字'],
          error: 'Bad Request',
        },
      },
    }),
    ApiResponse({
      status: 409,
      description: '用户已存在',
      schema: {
        example: {
          statusCode: 409,
          message: '该邮箱已被注册',
          error: 'Conflict',
        },
      },
    }),
    ApiResponse({
      status: 422,
      description: '验证码错误或已过期',
      schema: {
        example: {
          statusCode: 422,
          message: '验证码错误或已过期',
          error: 'Unprocessable Entity',
        },
      },
    }),
    ApiBody({
      type: RegisterDto,
      description: '注册请求参数',
      examples: {
        email_code: {
          summary: '邮箱验证码注册',
          description: '使用邮箱验证码进行注册',
          value: {
            type: 'email_code',
            email: 'user@example.com',
            username: 'testuser',
            password: 'password123',
            code: '123456',
          },
        },
        phone_code: {
          summary: '手机验证码注册',
          description: '使用手机验证码进行注册',
          value: {
            type: 'phone_code',
            phone: '13800138000',
            countryCode: '+86',
            username: 'testuser',
            password: 'password123',
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
  );
}

// 登录接口文档装饰器
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

// 重置密码接口文档装饰器
export function ApiResetPasswordDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '重置密码',
      description:
        '通过验证码重置用户密码。需要先调用发送验证码接口获取验证码，然后提供验证码和新密码完成重置。',
      tags: ['Auth'],
    }),
    ApiConsumes('application/json'),
    ApiProduces('application/json'),
    ApiResponse({
      status: 200,
      description: '密码重置成功',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', description: '重置是否成功' },
          message: { type: 'string', description: '重置结果消息' },
        },
        example: {
          success: true,
          message: '密码重置成功',
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: '请求参数错误',
      schema: {
        example: {
          statusCode: 400,
          message: ['密码必须包含至少一个字母和一个数字', '验证码至少4位'],
          error: 'Bad Request',
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
    ApiResponse({
      status: 422,
      description: '验证码错误或已过期',
      schema: {
        example: {
          statusCode: 422,
          message: '验证码错误或已过期',
          error: 'Unprocessable Entity',
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

// 刷新令牌接口文档装饰器
export function ApiRefreshTokenDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '刷新访问令牌',
      description:
        '使用刷新令牌获取新的访问令牌。当访问令牌过期时，可以使用此接口获取新的访问令牌而无需重新登录。',
      tags: ['Auth'],
    }),
    ApiConsumes('application/json'),
    ApiProduces('application/json'),
    ApiBody({
      description: '刷新令牌请求体',
      schema: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: {
            type: 'string',
            description: '用于换取新访问令牌的刷新令牌',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh...',
          },
        },
        example: {
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh...',
        },
      },
    }),
    ApiResponse({
      status: 200,
      description: '令牌刷新成功，返回新的访问令牌和刷新令牌（令牌轮换）',
      schema: {
        type: 'object',
        properties: {
          accessToken: {
            type: 'string',
            description: '新的访问令牌',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          },
          refreshToken: {
            type: 'string',
            description: '新的刷新令牌（令牌轮换后生成的新令牌）',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.new_refresh...',
          },
        },
        example: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.new_refresh...',
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: '刷新令牌无效或已过期',
      schema: {
        example: {
          statusCode: 401,
          message: '刷新令牌无效或已过期',
          error: 'Unauthorized',
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: '请求参数错误',
      schema: {
        example: {
          statusCode: 400,
          message: '刷新令牌不能为空',
          error: 'Bad Request',
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
  );
}

// 退出登录接口文档装饰器
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
