import { Injectable, Logger } from '@nestjs/common';
import { ITaskHandler } from './task-handler.interface';

@Injectable()
export class TaskHandlerRegistry {
  private readonly logger = new Logger(TaskHandlerRegistry.name);
  private readonly handlers = new Map<string, ITaskHandler>();

  /**
   * 注册一个新的任务处理器
   */
  register(handler: ITaskHandler): void {
    if (this.handlers.has(handler.name)) {
      this.logger.warn(
        `Task handler [${handler.name}] is already registered. Overwriting.`,
      );
    }
    this.handlers.set(handler.name, handler);
    this.logger.debug(`Task handler [${handler.name}] registered.`);
  }

  /**
   * 获取指定名称的任务处理器
   */
  getHandler(name: string): ITaskHandler | undefined {
    return this.handlers.get(name);
  }
}
