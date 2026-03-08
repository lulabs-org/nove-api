/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-11-24 00:09:58
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-12-09 18:15:33
 * @FilePath: /lulab_backend/src/hook-tencent-mtg/controllers/tencent-webhook.controller.spec.ts
 * @Description:
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import { Logger } from '@nestjs/common';
import { TencentWebhookController } from './tencent-webhook.controller';
import { TencentEventHandlerService } from '../services/event-handler.service';
import { TencentMeetingEvent } from '../types';

describe('TencentWebhookController', () => {
  let controller: TencentWebhookController;
  let eventHandlerService: { handleEvent: jest.Mock };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    eventHandlerService = { handleEvent: jest.fn() };
    controller = new TencentWebhookController(
      eventHandlerService as unknown as TencentEventHandlerService,
    );

    // Mock logger to avoid console output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  describe('verifyTencentWebhook', () => {
    it('should return decrypted string and log request', async () => {
      const logSpy = jest.spyOn(Logger.prototype, 'log');

      const result = await controller.verifyTencentWebhook(
        'decrypted_check_str',
      );

      expect(result).toBe('decrypted_check_str');
      expect(logSpy).toHaveBeenCalledWith(
        'Received Tencent Meeting Webhook URL verification request',
      );
    });
  });

  describe('handleTencentWebhook', () => {
    const mockEvent: TencentMeetingEvent = {
      event: 'meeting.ended',
      trace_id: 'trace-123',
      payload: [],
    } as unknown as TencentMeetingEvent;

    it('should return success and call event handler', async () => {
      eventHandlerService.handleEvent.mockResolvedValue(undefined);

      const result = await controller.handleTencentWebhook(mockEvent);

      expect(result).toBe('successfully received callback');
      expect(eventHandlerService.handleEvent).toHaveBeenCalledTimes(1);
      expect(eventHandlerService.handleEvent).toHaveBeenCalledWith(mockEvent);
    });

    it('should log error when event handler rejects asynchronously', async () => {
      const error = new Error('Async fail');
      const errorSpy = jest.spyOn(Logger.prototype, 'error');
      eventHandlerService.handleEvent.mockRejectedValue(error);

      const result = await controller.handleTencentWebhook(mockEvent);
      expect(result).toBe('successfully received callback');

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to handle event asynchronously',
        error.stack,
      );
    });
  });
});
