import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiHeader,
  ApiConsumes,
  ApiProduces,
} from '@nestjs/swagger';

export function ApiSendCodeDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '发送验证码',
      description:
        '向指定的邮箱或手机号发送验证码。支持注册、登录、重置密码等场景。发送频率限制：同一目标60秒内只能发送一次。验证码有效期为5分钟。',
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
