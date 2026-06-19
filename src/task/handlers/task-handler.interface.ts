import { Job } from 'bullmq';

export interface ITaskHandler {
  /**
   * 唯一标识任务处理器的名称
   */
  readonly name: string;

  /**
   * 执行具体的任务逻辑
   * @param job BullMQ Job 实例
   * @returns 任务执行结果
   */
  handle(job: Job): Promise<any>;
}
