/*
 * @Author: AI Agent
 * @Date: 2026-03-26
 * @FilePath: /lulab_backend/src/lark-meeting/service/lark-event-ws.service.spec.ts
 * @Description: Unit tests for LarkEventWsService, specifically the WSClient lifecycle management.
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { LarkEventWsService } from './lark-event-ws.service';
import { LarkClient } from '@/integrations/lark/lark.client';
import { LarkMeetingService } from './lark-meeting.service';

describe('LarkEventWsService', () => {
  let service: LarkEventWsService;
  let mockWsClientClose: jest.Mock;
  let mockWsClientStart: jest.Mock;

  beforeEach(async () => {
    mockWsClientClose = jest.fn();
    mockWsClientStart = jest.fn().mockReturnValue(undefined);

    const mockLarkClient = {
      wsClient: {
        start: mockWsClientStart,
        close: mockWsClientClose,
      },
    };

    const mockLarkMeetingService = {
      enqueueMeetingEnded: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LarkEventWsService,
        { provide: LarkClient, useValue: mockLarkClient },
        { provide: LarkMeetingService, useValue: mockLarkMeetingService },
      ],
    }).compile();

    service = module.get<LarkEventWsService>(LarkEventWsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleDestroy', () => {
    it('should close the WSClient when onModuleDestroy is called', () => {
      service.onModuleDestroy();
      expect(mockWsClientClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('onModuleInit', () => {
    it('should start the WSClient when onModuleInit is called', () => {
      service.onModuleInit();
      expect(mockWsClientStart).toHaveBeenCalledTimes(1);
    });
  });
});
