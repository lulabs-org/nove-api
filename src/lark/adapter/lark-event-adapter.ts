/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-05-02 19:30:00
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-11-23 00:05:12
 * @FilePath: /lulab_backend/src/lark-meeting/adapter/lark-event-adapter.ts
 * @Description: 飞书事件适配器
 *
 * Copyright (c) 2025 by 杨仕明, All Rights Reserved.
 */

import {
  EventDispatcher,
  CardActionHandler,
  generateChallenge,
} from '@larksuiteoapi/node-sdk';
import { Response, Request } from 'express';
import { pickRequestData } from './pick-request-data';

/**
 * 创建飞书事件适配器
 * @param dispatcher 事件分发器
 * @param options 配置选项
 * @returns 处理函数
 */
export const createLarkAdapter = (
  dispatcher: EventDispatcher | CardActionHandler,
  options?: {
    autoChallenge?: boolean;
    needCheck?: boolean;
  },
) => {
  return async (req: Request, res: Response) => {
    // if (req.url !== path) {
    //   return;
    // }

    const requestData = pickRequestData(req);
    const data = Object.assign(
      Object.create({
        headers: req.headers,
      } as Record<string, unknown>),
      requestData,
    ) as Record<string, unknown>;

    // 是否自动响应 challenge 事件
    // https://open.feishu.cn/document/ukTMukTMukTM/uYDNxYjL2QTM24iN0EjN/event-subscription-configure-/request-url-configuration-case
    const autoChallenge = options?.autoChallenge ?? false;

    if (autoChallenge) {
      const { isChallenge, challenge } = generateChallenge(data, {
        encryptKey: dispatcher?.encryptKey,
      });

      if (isChallenge) {
        res.end(JSON.stringify(challenge));
        return;
      }
    }

    const value = (await dispatcher.invoke(data)) as Record<string, unknown>;
    // event don't need response
    if (dispatcher instanceof CardActionHandler) {
      res.end(JSON.stringify(value));
    }
    res.end('');
  };
};
