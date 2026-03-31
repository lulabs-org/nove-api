import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiHeader,
  ApiConsumes,
  ApiProduces,
} from '@nestjs/swagger';
import { RegisterDto } from '../../dto/register.dto';
import { AuthResponseDto } from '../../dto/auth-response.dto';

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
