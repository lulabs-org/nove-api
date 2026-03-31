/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-09-23 06:15:34
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2026-01-07 15:22:56
 * @FilePath: /lulab_backend/src/hook-tencent-mtg/decorators/tencent-webhook.decorators.ts
 * @Description: 腾讯会议Webhook装饰器
 *
 * Copyright (c) 2025 by ${git_name_email}, All Rights Reserved.
 */

import { applyDecorators } from '@nestjs/common';
import {
  ApiOperation,
  ApiQuery,
  ApiHeader,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { TencentWebhookEventBodyDto } from '../dto/tencent-webhook-body.dto';

/**
 * 腾讯会议Webhook URL验证装饰器
 * 用于腾讯会议webhook URL有效性验证
 */
export function ApiTencentUrlVerificationDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '腾讯会议Webhook URL验证',
      description: '用于腾讯会议webhook URL有效性验证',
      tags: ['Tencent Meeting'],
    }),
    ApiQuery({
      name: 'check_str',
      description: '验证字符串（Base64编码，URL参数）',
      required: true,
      example: 'check_str',
    }),
    ApiHeader({
      name: 'timestamp',
      description: '时间戳，与 nonce 结合使用，用于签名校验。',
      required: true,
    }),
    ApiHeader({
      name: 'nonce',
      description: '随机数，与timestamp 结合使用，用于签名校验。',
      required: true,
    }),
    ApiHeader({
      name: 'signature',
      description:
        '加密签名，signature 的计算结合开发者填写的 token、timestamp、nonce、消息体，签名计算方法请参见-https://cloud.tencent.com/document/product/1095/51612',
      required: true,
    }),
    ApiResponse({
      status: 200,
      description: '验证成功，返回解密后的明文',
    }),
    ApiResponse({
      status: 400,
      description: '缺少必要参数',
    }),
    ApiResponse({
      status: 403,
      description: '签名验证失败',
    }),
  );
}

/**
 * 腾讯会议Webhook事件接收装饰器
 * 接收腾讯会议的Webhook事件通知
 */
export function ApiTencentEventReceiverDocs() {
  return applyDecorators(
    ApiOperation({
      summary: '腾讯会议Webhook事件接收',
      description:
        '接收腾讯会议的Webhook事件通知。支持会议创建、开始、结束、录制完成等事件。请求体中的data字段是Base64编码的加密事件数据，需要使用EncodingAESKey进行解密。',
      tags: ['Tencent Meeting'],
    }),
    ApiHeader({
      name: 'timestamp',
      description: '时间戳，与 nonce 结合使用，用于签名校验。',
      required: true,
      example: '1766194600155',
    }),
    ApiHeader({
      name: 'nonce',
      description: '随机数，与timestamp 结合使用，用于签名校验。',
      required: true,
      example: '33247089',
    }),
    ApiHeader({
      name: 'signature',
      description:
        '加密签名，signature 的计算结合开发者填写的 token、timestamp、nonce、消息体，签名计算方法请参见-https://cloud.tencent.com/document/product/1095/51612',
      required: true,
      example: 'b4f6b42fa2a5d73a9b089061edf0c8791a414e58',
    }),
    ApiBody({
      description: '腾讯会议Webhook事件请求体',
      type: TencentWebhookEventBodyDto,
      required: true,
    }),
    ApiResponse({
      status: 200,
      description:
        'Webhook处理成功，必须返回字符串 "successfully received callback"（不含引号）',
      schema: {
        type: 'string',
        example: 'successfully received callback',
      },
    }),
    ApiResponse({
      status: 400,
      description: '请求参数错误，如缺少必要的请求头或请求体格式不正确',
    }),
    ApiResponse({
      status: 401,
      description: '签名验证失败，可能是timestamp、nonce或signature不正确',
    }),
    ApiResponse({
      status: 500,
      description: '服务器内部错误，如解密失败或事件处理异常',
    }),
  );
}
