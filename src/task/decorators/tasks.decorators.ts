/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-10-03 14:30:00
 * @Description: Tasks controller decorators following the same pattern as user decorators
 */

import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiProduces,
  ApiConsumes,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { TaskStatus, TaskType } from '@prisma/client';
import { CreateOnceDto } from '../dtos/create-once.dto';
import { CreateCronDto } from '../dtos/create-cron.dto';
import { UpdateTaskDto } from '../dtos/update-task.dto';

export const ApiHealthCheckDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '任务服务健康检查',
      description: '检查任务服务是否正常运行',
    }),
    ApiProduces('application/json'),
    ApiResponse({
      status: 200,
      description: '服务正常运行',
      schema: {
        example: {
          status: 'ok',
          timestamp: '2025-10-01T08:00:00.000Z',
        },
      },
    }),
  );

export const ApiCreateOnceDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '创建一次性任务（在指定时间点执行）',
      description:
        '创建一个在指定时间点执行的一次性任务，任务将在指定的ISO 8601时间自动执行',
    }),
    ApiConsumes('application/json'),
    ApiProduces('application/json'),
    ApiResponse({
      status: 201,
      description: '已创建的一次性任务',
      schema: {
        example: {
          id: 'clx9abc123def456',
          name: '数据同步任务',
          handler: 'sync_data_handler',
          type: 'ONCE',
          queueName: 'tasks',
          jobId: 'job_123456',
          repeatKey: null,
          cron: null,
          runAt: '2025-10-15T14:30:00.000Z',
          payload: { userId: 123, action: 'sync_data' },
          status: 'SCHEDULED',
          lastError: null,
          createdAt: '2025-10-01T08:00:00.000Z',
          updatedAt: '2025-10-01T08:00:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: '请求参数错误',
      schema: {
        example: {
          statusCode: 400,
          message: ['runAt必须是有效的ISO 8601时间格式'],
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
    ApiBearerAuth(),
    ApiBody({
      type: CreateOnceDto,
      description: '一次性任务创建参数',
      examples: {
        basic_example: {
          summary: '基本一次性任务',
          description: '创建简单的一次性任务',
          value: {
            name: '数据同步任务',
            handler: 'sync_data_handler',
            runAt: '2025-10-15T14:30:00.000Z',
            payload: { userId: 123, action: 'sync_data' },
          },
        },
        with_job_id: {
          summary: '指定任务ID',
          description: '创建时指定自定义任务ID',
          value: {
            name: '邮件发送任务',
            handler: 'send_email_handler',
            runAt: '2025-10-16T09:00:00.000Z',
            payload: { email: 'user@example.com', template: 'welcome' },
            jobIdHint: 'email-job-001',
          },
        },
        http_request: {
          summary: 'HTTP 请求任务',
          description: '在指定时间发起一个自定义的 HTTP 请求',
          value: {
            name: '发起外部Webhook',
            handler: 'invoke_http',
            runAt: '2025-10-16T10:00:00.000Z',
            payload: {
              url: 'https://api.example.com/webhook',
              method: 'POST',
              data: { event: 'task_started' },
              headers: { Authorization: 'Bearer token' },
            },
          },
        },
      },
    }),
  );

export const ApiCreateCronDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '创建 Cron 任务（pattern/cron 周期执行）',
      description:
        '创建一个按照Cron表达式周期性执行的任务，使用上海时区(Asia/Shanghai)',
    }),
    ApiConsumes('application/json'),
    ApiProduces('application/json'),
    ApiResponse({
      status: 201,
      description: '已创建的周期任务',
      schema: {
        example: {
          id: 'clx9abc123def457',
          name: '每日数据备份',
          handler: 'backup_handler',
          type: 'CRON',
          queueName: 'tasks',
          jobId: 'job_789012',
          repeatKey: '__default__::cron::daily-backup::0 0 2 * * *',
          cron: '0 0 2 * * *',
          runAt: null,
          payload: { backupType: 'full', retentionDays: 30 },
          status: 'SCHEDULED',
          lastError: null,
          createdAt: '2025-10-01T08:00:00.000Z',
          updatedAt: '2025-10-01T08:00:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: '请求参数错误',
      schema: {
        example: {
          statusCode: 400,
          message: ['cron表达式格式不正确'],
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
    ApiBearerAuth(),
    ApiBody({
      type: CreateCronDto,
      description: 'Cron任务创建参数',
      examples: {
        daily_backup: {
          summary: '每日备份任务',
          description: '每天凌晨2点执行数据备份',
          value: {
            name: '每日数据备份',
            handler: 'backup_handler',
            cron: '0 0 2 * * *',
            payload: { backupType: 'full', retentionDays: 30 },
          },
        },
        hourly_sync: {
          summary: '每小时同步任务',
          description: '每小时执行一次数据同步',
          value: {
            name: '小时数据同步',
            handler: 'sync_data_handler',
            cron: '0 0 * * * *',
            payload: { syncType: 'incremental', source: 'api' },
          },
        },
        http_polling: {
          summary: 'HTTP 轮询任务',
          description: '每5分钟调用一次指定的 API',
          value: {
            name: '健康检查轮询',
            handler: 'invoke_http',
            cron: '*/5 * * * *',
            payload: {
              url: '/api/internal/health-check',
              method: 'GET',
              timeout: 5000,
            },
          },
        },
      },
    }),
  );

export const ApiListTasksDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '任务列表（分页/搜索/排序）',
      description: '获取任务列表，支持分页、搜索、状态筛选、类型筛选和排序功能',
    }),
    ApiProduces('application/json'),
    ApiResponse({
      status: 200,
      description: '任务列表分页数据',
      schema: {
        example: {
          items: [
            {
              id: 'clx9abc123def456',
              name: '数据同步任务',
              handler: 'sync_data_handler',
              type: 'ONCE',
              queueName: 'tasks',
              jobId: 'job_123456',
              repeatKey: null,
              cron: null,
              runAt: '2025-10-15T14:30:00.000Z',
              payload: { userId: 123, action: 'sync_data' },
              status: 'SCHEDULED',
              lastError: null,
              createdAt: '2025-10-01T08:00:00.000Z',
              updatedAt: '2025-10-01T08:00:00.000Z',
            },
          ],
          total: 25,
          page: 1,
          pageSize: 20,
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
    ApiQuery({
      name: 'search',
      required: false,
      description: '按名称模糊搜索',
      example: '数据同步',
    }),
    ApiQuery({
      name: 'status',
      required: false,
      enum: TaskStatus,
      description: '任务状态筛选',
      example: 'SCHEDULED',
    }),
    ApiQuery({
      name: 'type',
      required: false,
      enum: TaskType,
      description: '任务类型筛选',
      example: 'ONCE',
    }),
    ApiQuery({
      name: 'page',
      required: false,
      type: Number,
      description: '页码，默认为1',
      example: 1,
    }),
    ApiQuery({
      name: 'pageSize',
      required: false,
      type: Number,
      description: '每页记录数，默认为20',
      example: 20,
    }),
    ApiQuery({
      name: 'orderBy',
      required: false,
      enum: ['createdAt', 'updatedAt'],
      description: '排序字段，默认为createdAt',
      example: 'createdAt',
    }),
    ApiQuery({
      name: 'orderDir',
      required: false,
      enum: ['asc', 'desc'],
      description: '排序方向，默认为desc',
      example: 'desc',
    }),
  );

export const ApiTaskDetailDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '任务详情',
      description: '根据任务ID获取单个任务的详细信息',
    }),
    ApiProduces('application/json'),
    ApiResponse({
      status: 200,
      description: '任务详细信息',
      schema: {
        example: {
          id: 'clx9abc123def456',
          name: '数据同步任务',
          handler: 'sync_data_handler',
          type: 'ONCE',
          queueName: 'tasks',
          jobId: 'job_123456',
          repeatKey: null,
          cron: null,
          runAt: '2025-10-15T14:30:00.000Z',
          payload: { userId: 123, action: 'sync_data' },
          status: 'SCHEDULED',
          lastError: null,
          createdAt: '2025-10-01T08:00:00.000Z',
          updatedAt: '2025-10-01T08:00:00.000Z',
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
      status: 404,
      description: '任务不存在',
      schema: {
        example: {
          statusCode: 404,
          message: '任务不存在',
          error: 'Not Found',
        },
      },
    }),
    ApiBearerAuth(),
    ApiParam({
      name: 'id',
      description: '任务 ID',
      type: 'string',
      example: 'clx9abc123def456',
    }),
  );

export const ApiUpdateTaskDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '更新任务（可改名/cron/payload/status）',
      description:
        '更新任务的名称、Cron表达式、负载数据或状态。注意：修改Cron表达式会重新创建BullMQ任务',
    }),
    ApiConsumes('application/json'),
    ApiProduces('application/json'),
    ApiResponse({
      status: 200,
      description: '更新后的任务信息',
      schema: {
        example: {
          id: 'clx9abc123def456',
          name: '更新的任务名称',
          handler: 'invoke_http',
          type: 'CRON',
          queueName: 'tasks',
          jobId: 'job_123456',
          repeatKey: '__default__::cron::updated-task::0 0 3 * * *',
          cron: '0 0 3 * * *',
          runAt: null,
          payload: { userId: 456, action: 'updated_action' },
          status: 'SCHEDULED',
          lastError: null,
          createdAt: '2025-10-01T08:00:00.000Z',
          updatedAt: '2025-10-01T09:30:00.000Z',
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: '请求参数错误',
      schema: {
        example: {
          statusCode: 400,
          message: ['cron表达式格式不正确'],
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
      status: 404,
      description: '任务不存在',
      schema: {
        example: {
          statusCode: 404,
          message: '任务不存在',
          error: 'Not Found',
        },
      },
    }),
    ApiBearerAuth(),
    ApiParam({
      name: 'id',
      description: '任务 ID',
      type: 'string',
      example: 'clx9abc123def456',
    }),
    ApiBody({
      type: UpdateTaskDto,
      description: '任务更新参数',
      examples: {
        update_name: {
          summary: '更新任务名称',
          description: '仅更新任务名称',
          value: {
            name: '更新的任务名称',
          },
        },
        update_cron: {
          summary: '更新Cron表达式',
          description: '修改任务的执行时间',
          value: {
            cron: '0 0 3 * * *',
          },
        },
        update_payload: {
          summary: '更新负载数据',
          description: '修改任务的负载数据',
          value: {
            payload: { userId: 456, action: 'updated_action' },
          },
        },
        update_status: {
          summary: '更新状态',
          description: '修改任务状态',
          value: {
            status: 'SCHEDULED',
          },
        },
      },
    }),
  );

export const ApiRemoveTaskDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '删除任务（会移除对应队列任务）',
      description:
        '删除指定任务，会同时移除对应的BullMQ队列任务。对于Cron任务会移除重复任务，对于一次性任务会移除具体任务',
    }),
    ApiProduces('application/json'),
    ApiResponse({
      status: 200,
      description: '删除成功响应',
      schema: {
        example: { ok: true },
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
      status: 404,
      description: '任务不存在',
      schema: {
        example: {
          statusCode: 404,
          message: '任务不存在',
          error: 'Not Found',
        },
      },
    }),
    ApiBearerAuth(),
    ApiParam({
      name: 'id',
      description: '任务 ID',
      type: 'string',
      example: 'clx9abc123def456',
    }),
  );

export const ApiPauseQueueDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '暂停整个任务队列（数据库状态标记为 PAUSED）',
      description:
        '暂停整个任务队列，所有状态为SCHEDULED的任务会被标记为PAUSED状态，队列处理会被暂停',
    }),
    ApiProduces('application/json'),
    ApiResponse({
      status: 200,
      description: '暂停成功响应',
      schema: {
        example: { ok: true },
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

export const ApiResumeQueueDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '恢复整个任务队列（数据库状态恢复为 SCHEDULED）',
      description:
        '恢复被暂停的任务队列，所有状态为PAUSED的任务会被恢复为SCHEDULED状态，队列处理会重新启动',
    }),
    ApiProduces('application/json'),
    ApiResponse({
      status: 200,
      description: '恢复成功响应',
      schema: {
        example: { ok: true },
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

export const ApiRunNowDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '立即执行某任务一次（不改变其计划）',
      description:
        '立即触发执行指定的任务一次，不改变任务原有的执行计划。对于Cron任务，会创建一个独立的立即执行任务',
    }),
    ApiProduces('application/json'),
    ApiResponse({
      status: 200,
      description: '立即执行任务的响应，包含新创建的任务ID',
      schema: {
        example: { jobId: 'job_987654' },
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
      status: 404,
      description: '任务不存在',
      schema: {
        example: {
          statusCode: 404,
          message: '任务不存在',
          error: 'Not Found',
        },
      },
    }),
    ApiBearerAuth(),
    ApiParam({
      name: 'id',
      description: '任务 ID',
      type: 'string',
      example: 'clx9abc123def456',
    }),
  );

export const ApiPauseTaskDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '暂停单个任务（从队列中移除并在数据库标记为 PAUSED）',
      description:
        '暂停指定的任务，对于定时任务会从调度器中移除，直到调用恢复接口为止。',
    }),
    ApiProduces('application/json'),
    ApiResponse({
      status: 200,
      description: '暂停成功响应',
      schema: {
        example: { ok: true },
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
      status: 404,
      description: '任务不存在',
      schema: {
        example: {
          statusCode: 404,
          message: '任务不存在',
          error: 'Not Found',
        },
      },
    }),
    ApiBearerAuth(),
    ApiParam({
      name: 'id',
      description: '任务 ID',
      type: 'string',
      example: 'clx9abc123def456',
    }),
  );

export const ApiResumeTaskDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: '恢复单个任务（重新加入队列调度并在数据库标记为 SCHEDULED）',
      description: '恢复被暂停的任务，会将其重新加入到任务队列调度中。',
    }),
    ApiProduces('application/json'),
    ApiResponse({
      status: 200,
      description: '恢复成功响应',
      schema: {
        example: { ok: true },
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
      status: 404,
      description: '任务不存在',
      schema: {
        example: {
          statusCode: 404,
          message: '任务不存在',
          error: 'Not Found',
        },
      },
    }),
    ApiBearerAuth(),
    ApiParam({
      name: 'id',
      description: '任务 ID',
      type: 'string',
      example: 'clx9abc123def456',
    }),
  );
