import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiProduces,
  ApiHeader,
  ApiConsumes,
} from '@nestjs/swagger';
import { UpdateProfileDto } from '@/user/dto/update-profile.dto';
import { UserProfileResponseDto } from '@/user/dto/user-profile-response.dto';

export const ApiGetUserProfileDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '获取当前用户信息',
      description:
        '获取当前登录用户的详细信息，包括基本信息、验证状态、用户档案等。需要提供有效的访问令牌。',
      tags: ['User'],
    }),
    ApiProduces('application/json'),
    ApiResponse({
      status: 200,
      description: '获取用户信息成功，返回用户详细信息',
      type: UserProfileResponseDto,
      examples: {
        success: {
          summary: '获取用户信息成功示例',
          value: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            username: 'testuser',
            email: 'user@example.com',
            countryCode: '+86',
            phone: '13800138000',
            emailVerified: true,
            phoneVerified: true,
            lastLoginAt: '2024-01-01T12:00:00.000Z',
            createdAt: '2024-01-01T00:00:00.000Z',
            profile: {
              name: '张三',
              avatar: 'https://example.com/avatar.jpg',
              bio: '这是我的个人简介',
              fullName: '张三',
              dateOfBirth: '1990-01-01T00:00:00.000Z',
              gender: 'male',
              city: '北京',
              country: '中国',
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
    ApiBearerAuth(),
  );

export const ApiUpdateUserProfileDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '更新用户资料',
      description:
        '更新当前登录用户的资料信息，包括用户名、邮箱、手机号、姓名、个人简介等。头像由专用上传接口维护。需要提供有效的访问令牌。',
      tags: ['User'],
    }),
    ApiConsumes('application/json'),
    ApiProduces('application/json'),
    ApiResponse({
      status: 200,
      description: '更新成功，返回更新后的用户信息',
      type: UserProfileResponseDto,
      examples: {
        success: {
          summary: '更新成功示例',
          value: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            username: 'newusername',
            email: 'newemail@example.com',
            countryCode: '+86',
            phone: '13800138001',
            emailVerified: false,
            phoneVerified: false,
            lastLoginAt: '2024-01-01T12:00:00.000Z',
            createdAt: '2024-01-01T00:00:00.000Z',
            profile: {
              name: '李四',
              bio: '这是我更新后的个人简介',
            },
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: '请求参数错误',
      schema: {
        example: {
          statusCode: 400,
          message: ['邮箱格式不正确', '用户名只能包含字母、数字和下划线'],
          error: 'Bad Request',
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
    ApiResponse({
      status: 409,
      description: '用户名/邮箱/手机号已被其他用户使用',
      schema: {
        example: {
          statusCode: 409,
          message: '该邮箱已被其他用户使用',
          error: 'Conflict',
        },
      },
    }),
    ApiBearerAuth(),
    ApiBody({
      type: UpdateProfileDto,
      description: '更新用户资料请求参数',
      examples: {
        basic_update: {
          summary: '基本信息更新',
          description: '更新用户名和邮箱',
          value: {
            username: 'newusername',
            email: 'newemail@example.com',
          },
        },
        profile_update: {
          summary: '档案信息更新',
          description: '更新用户档案信息',
          value: {
            name: '李四',
            bio: '这是我更新后的个人简介',
          },
        },
        contact_update: {
          summary: '联系方式更新',
          description: '更新手机号码',
          value: {
            phone: '13800138001',
            countryCode: '+86',
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

export const ApiUploadUserAvatarDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '上传当前用户头像',
      description:
        '仅接受普通用户 JWT。图片会被重新编码为 512×512 WebP，并替换当前头像。',
      tags: ['User'],
    }),
    ApiBearerAuth(),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        required: ['file'],
        properties: {
          file: { type: 'string', format: 'binary' },
        },
      },
    }),
    ApiResponse({
      status: 200,
      description: '头像上传成功',
      type: UserProfileResponseDto,
    }),
    ApiResponse({ status: 400, description: '文件缺失、格式错误或图片过大' }),
    ApiResponse({ status: 401, description: '未登录或访问令牌无效' }),
    ApiResponse({ status: 403, description: '不接受 API Key 或 OAuth 认证' }),
    ApiResponse({ status: 413, description: '上传文件超过 5 MB' }),
    ApiResponse({ status: 503, description: '头像存储服务未配置或不可用' }),
  );

export const ApiDeleteUserAvatarDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '删除当前用户头像',
      description: '仅接受普通用户 JWT。清空数据库头像并尽力删除托管对象。',
      tags: ['User'],
    }),
    ApiBearerAuth(),
    ApiProduces('application/json'),
    ApiResponse({
      status: 200,
      description: '头像删除成功',
      type: UserProfileResponseDto,
    }),
    ApiResponse({ status: 401, description: '未登录或访问令牌无效' }),
    ApiResponse({ status: 403, description: '不接受 API Key 或 OAuth 认证' }),
  );
