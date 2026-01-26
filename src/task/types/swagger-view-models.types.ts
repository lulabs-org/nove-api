import { TaskStatus, TaskType } from '@prisma/client';

export class OkResponse {
  ok!: true;
}

export class RunNowResponse {
  jobId!: string | number | null;
}

export class TaskEntity {
  id!: string;
  name!: string;
  type!: TaskType;
  queueName!: string;
  jobId!: string | null;
  repeatKey!: string | null;
  cron!: string | null;
  runAt!: Date | null;
  payload!: Record<string, unknown>;
  status!: TaskStatus;
  lastError!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class PaginatedTasksResponse {
  items!: TaskEntity[];
  total!: number;
  page!: number;
  pageSize!: number;
}
