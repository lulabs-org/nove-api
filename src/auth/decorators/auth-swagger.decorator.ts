/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-09-04 17:10:00
 * @Description: 认证模块 Swagger API 文档集中装饰器
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */

import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiHeader,
  ApiConsumes,
  ApiProduces,
} from '@nestjs/swagger';
import {
  LoginDto,
  RegisterDto,
  AuthResponseDto,
  LogoutResponseDto,
  PermissionsResponseDto,
  AuthUserWithPermissionsDto,
} from '../dto';

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
  );
}

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
  );
}

export function ApiSendCodeDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '发送验证码',
      description:
        '向指定的邮箱或手机号发送验证码。支持注册、登录、重置密码等场景。发送频率限制：同一目标60秒内只能发送一次。验证码有效期为5分钟。',
      tags: ['Auth'],
    }),
    ApiConsumes('application/json'),
    ApiProduces('application/json'),
    ApiResponse({
      status: 200,
      description: '验证码发送成功，请查收邮箱或短信',
      schema: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            description: '发送是否成功',
            example: true,
          },
          message: {
            type: 'string',
            description: '发送结果消息',
            example: '验证码已发送，请查收',
          },
        },
        example: { success: true, message: '验证码已发送到您的邮箱，请查收' },
      },
    }),
    ApiResponse({
      status: 400,
      description: '请求参数错误，邮箱或手机号格式不正确',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: '邮箱格式不正确' },
          statusCode: { type: 'number', example: 400 },
          error: { type: 'string', example: 'Bad Request' },
        },
        example: {
          success: false,
          message: '邮箱格式不正确',
          statusCode: 400,
          error: 'Bad Request',
        },
      },
    }),
    ApiResponse({
      status: 429,
      description: '发送过于频繁，请稍后再试',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: '发送过于频繁，请60秒后再试' },
          statusCode: { type: 'number', example: 429 },
          error: { type: 'string', example: 'Too Many Requests' },
        },
        example: {
          success: false,
          message: '发送过于频繁，请60秒后再试',
          statusCode: 429,
          error: 'Too Many Requests',
        },
      },
    }),
    ApiResponse({
      status: 500,
      description: '服务器内部错误，验证码发送失败',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: '验证码发送失败，请稍后重试' },
          statusCode: { type: 'number', example: 500 },
          error: { type: 'string', example: 'Internal Server Error' },
        },
        example: {
          success: false,
          message: '验证码发送失败，请稍后重试',
          statusCode: 500,
          error: 'Internal Server Error',
        },
      },
    }),
    ApiBody({
      description: '发送验证码请求参数',
      schema: {
        type: 'object',
        properties: {
          target: {
            type: 'string',
            description: '邮箱或手机号',
            example: 'user@example.com||13800000000',
          },
          type: {
            type: 'string',
            description: '验证码类型',
            enum: ['register', 'login', 'reset_password'],
            example: 'register',
          },
          countryCode: {
            type: 'string',
            description: '国家代码',
            example: '+86',
          },
        },
        required: ['target', 'type'],
      },
    }),
    ApiHeader({
      name: 'Content-Type',
      description: '请求内容类型',
      required: true,
      schema: { type: 'string', default: 'application/json' },
    }),
  );
}

export function ApiVerifyCodeDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '验证验证码',
      description:
        '验证指定邮箱或手机号的验证码是否有效，用于注册、登录、重置密码等场景。',
      tags: ['Auth'],
    }),
    ApiConsumes('application/json'),
    ApiProduces('application/json'),
    ApiResponse({
      status: 200,
      description: '验证结果返回',
      schema: {
        type: 'object',
        properties: {
          valid: { type: 'boolean', description: '验证码是否有效' },
          message: { type: 'string', description: '验证结果消息' },
        },
        example: { valid: true, message: '验证码验证成功' },
      },
    }),
    ApiResponse({
      status: 400,
      description: '请求参数错误',
      schema: {
        example: {
          statusCode: 400,
          message: ['验证码至少4位', '目标不能为空'],
          error: 'Bad Request',
        },
      },
    }),
    ApiResponse({
      status: 422,
      description: '验证码错误或已过期',
      schema: { example: { valid: false, message: '验证码错误或已过期' } },
    }),
    ApiHeader({
      name: 'Content-Type',
      description: '请求内容类型',
      required: true,
      schema: { type: 'string', default: 'application/json' },
    }),
  );
}

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
      description:
        '刷新令牌请求体。Web 客户端可通过 HttpOnly Cookie 携带 refreshToken。',
      schema: {
        type: 'object',
        properties: {
          refreshToken: {
            type: 'string',
            description:
              '用于换取新访问令牌的刷新令牌；Web 客户端可省略并从 Cookie 读取',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh...',
          },
          clientType: {
            type: 'string',
            enum: ['web', 'app'],
            description: '客户端类型：web-网页端，app-移动端',
            example: 'web',
          },
        },
        example: {
          clientType: 'web',
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
          clientType: {
            type: 'string',
            enum: ['web', 'app'],
            description: '客户端类型：web-网页端，app-移动端',
            example: 'web',
          },
        },
        example: {
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh...',
          deviceId: 'mobile-app-ios',
          revokeAllDevices: false,
          clientType: 'web',
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

export function ApiGetMeDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '获取当前用户信息',
      description: '获取当前登录用户的基本信息，包括用户ID、用户名和角色。',
      tags: ['Auth'],
    }),
    ApiProduces('application/json'),
    ApiResponse({
      status: 200,
      description: '成功获取用户信息',
      type: AuthUserWithPermissionsDto,
      examples: {
        success: {
          summary: '成功示例',
          value: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: '张三',
            roles: ['user'],
            permissions: ['user:read', 'meeting:create'],
          },
        },
        multipleRoles: {
          summary: '多角色示例',
          value: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: '李四',
            roles: ['user', 'manager'],
            permissions: ['user:read', 'meeting:create', 'meeting:update'],
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
    ApiHeader({
      name: 'Authorization',
      description: 'Bearer 访问令牌',
      required: true,
      schema: {
        type: 'string',
        example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    }),
  );
}

export function ApiGetPermissionsDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '获取当前用户权限',
      description:
        '获取当前登录用户的权限列表，包括用户基本信息和所有可用的权限。',
      tags: ['Auth'],
    }),
    ApiProduces('application/json'),
    ApiResponse({
      status: 200,
      description: '成功获取用户权限',
      type: PermissionsResponseDto,
      examples: {
        success: {
          summary: '成功示例',
          value: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: '张三',
            roles: ['user'],
            permissions: ['user:read', 'meeting:create', 'meeting:read'],
          },
        },
        multipleRoles: {
          summary: '多角色示例',
          value: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: '李四',
            roles: ['user', 'manager'],
            permissions: [
              'user:read',
              'meeting:create',
              'meeting:read',
              'meeting:update',
              'meeting:manage',
            ],
          },
        },
        adminRoles: {
          summary: '管理员角色示例',
          value: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: '王五',
            roles: ['admin'],
            permissions: [
              'user:read',
              'user:write',
              'user:delete',
              'meeting:create',
              'meeting:read',
              'meeting:update',
              'meeting:delete',
              'meeting:manage',
              'system:config',
            ],
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
    ApiHeader({
      name: 'Authorization',
      description: 'Bearer 访问令牌',
      required: true,
      schema: {
        type: 'string',
        example: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
    }),
  );
}
