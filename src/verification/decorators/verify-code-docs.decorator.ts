import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiConsumes,
  ApiProduces,
} from '@nestjs/swagger';

export function ApiVerifyCodeDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '验证验证码',
      description:
        '验证指定邮箱或手机号的验证码是否有效，用于注册、登录、重置密码等场景。',
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
