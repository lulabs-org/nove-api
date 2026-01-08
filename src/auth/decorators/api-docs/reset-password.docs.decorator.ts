/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2026-01-08 17:24:06
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-08 17:24:07
 * @FilePath: /lulab_backend/src/auth/decorators/api-docs/reset-password.docs.decorator.ts
 * @Description:
 *
 * Copyright (c) 2026 by LuLab-Team, All Rights Reserved.
 */
import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiConsumes,
  ApiProduces,
} from '@nestjs/swagger';

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
