import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiConsumes,
  ApiProduces,
  ApiBearerAuth,
} from '@nestjs/swagger';

export function ApiChangePasswordDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '修改密码',
      description:
        '已登录用户通过提供旧密码和新密码修改密码。需要 JWT 认证，并校验旧密码。修改成功后会撤销所有设备的会话令牌，并发送安全通知邮件。',
      tags: ['Auth'],
    }),
    ApiBearerAuth(),
    ApiConsumes('application/json'),
    ApiProduces('application/json'),
    ApiResponse({
      status: 200,
      description: '密码修改成功',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', description: '修改是否成功' },
          message: { type: 'string', description: '修改结果消息' },
        },
        example: {
          success: true,
          message: '密码修改成功',
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: '请求参数错误或旧密码错误',
      schema: {
        example: {
          statusCode: 400,
          message: '当前密码错误',
          error: 'Bad Request',
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: '未认证或访问令牌无效',
      schema: {
        example: {
          statusCode: 401,
          message: '未找到访问令牌',
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
