/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-01-16 10:00:00
 * @Description: TMeet Webhook请求体DTO
 */

import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * TMeet Webhook事件请求体
 * 对应腾讯会议POST请求的body格式
 */
export class TMeetWebhookEventBodyDto {
  @ApiProperty({
    description: 'Base64编码的加密事件数据',
    example:
      'eyJldmVudCI6Im1lZXRpbmcuY3JlYXRlZCIsInVuaXF1ZV9zZXF1ZW5jZSI6Ii4uLiJ9',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  data: string;
}

export { TMeetWebhookEventBodyDto as TencentWebhookEventBodyDto };
