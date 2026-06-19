import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Job } from 'bullmq';
import { AxiosRequestConfig } from 'axios';
import { ITaskHandler } from './task-handler.interface';
import { TaskHandlerRegistry } from './task-handler.registry';

interface HttpJobData {
  url?: string;
  method?: string;
  data?: unknown;
  payload?: unknown;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  timeout?: number;
  auth?: AxiosRequestConfig['auth'];
  responseType?: AxiosRequestConfig['responseType'];
}

@Injectable()
export class HttpTaskHandler implements ITaskHandler, OnModuleInit {
  private readonly logger = new Logger(HttpTaskHandler.name);
  readonly name = 'invoke_http';

  constructor(
    private readonly httpService: HttpService,
    private readonly registry: TaskHandlerRegistry,
  ) {}

  onModuleInit() {
    this.registry.register(this);
  }

  async handle(job: Job): Promise<unknown> {
    const jobData = job.data as HttpJobData;
    const url = jobData.url;
    const method = (jobData.method || 'POST').toUpperCase();

    // 支持 axios 的原生 data 字段，并向后兼容 payload 字段
    const data = jobData.data !== undefined ? jobData.data : jobData.payload;

    // 提取更多常用的 HTTP 请求配置参数
    const { headers, params, timeout, auth, responseType } = jobData;

    if (!url) {
      this.logger.warn('invoke_http: url 未提供，任务跳过执行');
      return { ok: false, message: 'url is required' };
    }

    // 如果是相对路径，则使用本地服务的地址
    let targetUrl = url;
    if (url.startsWith('/')) {
      const port = process.env.PORT || 3000;
      targetUrl = `http://127.0.0.1:${port}${url}`;
    }

    // 在日志中打印可能带查询参数的 URL 以便于调试
    const queryStr = params ? `?${new URLSearchParams(params).toString()}` : '';
    this.logger.log(`发起 HTTP 调用 [${method}] ${targetUrl}${queryStr}`);

    try {
      // 动态组装 axios 请求配置
      const requestConfig: AxiosRequestConfig = {
        url: targetUrl,
        method,
        ...(data !== undefined && { data }),
        ...(headers && { headers }),
        ...(params && { params }),
        ...(timeout && { timeout }),
        ...(auth && { auth }),
        ...(responseType && { responseType }),
      };

      const response = await firstValueFrom(
        this.httpService.request(requestConfig),
      );

      const responseDataSummary =
        typeof response.data === 'object'
          ? JSON.stringify(response.data)?.slice(0, 500)
          : String(response.data)?.slice(0, 500);

      this.logger.log(`HTTP 调用成功: ${responseDataSummary}`);
      return { ok: true, data: response.data as unknown };
    } catch (error: unknown) {
      const err = error as Error;
      this.logger.error(`HTTP 调用失败 [${targetUrl}]: ${err.message}`);
      throw err;
    }
  }
}
