import { ValidationPipeOptions } from '@nestjs/common';

/**
 * 全局 DTO 验证管道配置
 */
export const validationPipeOptions: ValidationPipeOptions = {
  whitelist: true, // 自动删除非DTO属性
  forbidNonWhitelisted: true, // 当有非白名单属性时抛出错误
  transform: true, // 自动转换类型
};

/**
 * 应用基础运行配置
 */
export const appConfig = {
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
};
