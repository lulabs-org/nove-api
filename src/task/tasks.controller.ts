/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-10-03 06:04:16
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-10-03 14:30:00
 * @FilePath: /lulab_backend/src/task/tasks.controller.ts
 * @Description:
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

// src/tasks/tasks.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiExtraModels, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '@/auth/decorators/public.decorator';
import { RequirePermissions } from '@/admin/permission/decorators/permissions.decorator';
import { TasksService } from './services/tasks.service';
import { CreateOnceDto } from './dto/create-once.dto';
import { CreateCronDto } from './dto/create-cron.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { QueryDto } from './dto/query.dto';
import {
  ApiHealthCheckDocs,
  ApiCreateOnceDocs,
  ApiCreateCronDocs,
  ApiListTasksDocs,
  ApiTaskDetailDocs,
  ApiUpdateTaskDocs,
  ApiRemoveTaskDocs,
  ApiPauseQueueDocs,
  ApiResumeQueueDocs,
  ApiRunNowDocs,
  ApiPauseTaskDocs,
  ApiResumeTaskDocs,
} from './decorators/tasks.decorators';
import {
  OkResponse,
  RunNowResponse,
  TaskEntity,
  PaginatedTasksResponse,
} from './dto/responses.dto';

@ApiTags('Tasks')
@ApiBearerAuth()
@ApiExtraModels(TaskEntity, PaginatedTasksResponse, OkResponse, RunNowResponse)
@Controller('tasks')
export class TasksController {
  constructor(private readonly service: TasksService) {}

  @ApiHealthCheckDocs()
  @Public()
  @Get('health')
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @ApiCreateOnceDocs()
  @RequirePermissions('task:create')
  @Post('once')
  createOnce(@Body() dto: CreateOnceDto) {
    return this.service.createOnce(dto);
  }

  @ApiCreateCronDocs()
  @RequirePermissions('task:create')
  @Post('cron')
  createCron(@Body() dto: CreateCronDto) {
    return this.service.createCron(dto);
  }

  @ApiListTasksDocs()
  @RequirePermissions('task:read')
  @Get()
  list(@Query() q: QueryDto) {
    return this.service.list(q);
  }

  @ApiTaskDetailDocs()
  @RequirePermissions('task:read')
  @Get(':id')
  detail(@Param('id') id: string) {
    return this.service.detail(id);
  }

  @ApiUpdateTaskDocs()
  @RequirePermissions('task:update')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.service.update(id, dto);
  }

  @ApiRemoveTaskDocs()
  @RequirePermissions('task:delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @ApiPauseQueueDocs()
  @RequirePermissions('task:pause')
  @Post('pause')
  pause() {
    return this.service.pauseQueue();
  }

  @ApiResumeQueueDocs()
  @RequirePermissions('task:resume')
  @Post('resume')
  resume() {
    return this.service.resumeQueue();
  }

  @ApiRunNowDocs()
  @RequirePermissions('task:run')
  @Post(':id/run')
  runNow(@Param('id') id: string) {
    return this.service.runNow(id);
  }

  @ApiPauseTaskDocs()
  @RequirePermissions('task:pause')
  @Post(':id/pause')
  pauseTask(@Param('id') id: string) {
    return this.service.pauseTask(id);
  }

  @ApiResumeTaskDocs()
  @RequirePermissions('task:resume')
  @Post(':id/resume')
  resumeTask(@Param('id') id: string) {
    return this.service.resumeTask(id);
  }
}
