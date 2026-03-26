/*
 * @Author: AI Agent
 * @Date: 2026-03-26
 * @FilePath: /lulab_backend/src/integrations/lark/lark.client.spec.ts
 * @Description: Unit tests for LarkClient, specifically the WSClient lifecycle management.
 *
 * Copyright (c) 2025 by LuLab-Team, All Rights Reserved.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { LarkClient } from './lark.client';
import { larkConfig } from '../../configs/lark.config';

describe('LarkClient', () => {
  let larkClient: LarkClient;
  let mockWsClientClose: jest.Mock;

  beforeEach(async () => {
    // Mock the wsClient close method
    mockWsClientClose = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LarkClient,
        {
          provide: larkConfig.KEY,
          useValue: {
            appId: 'test-app-id',
            appSecret: 'test-app-secret',
            logLevel: 'error',
          },
        },
      ],
    }).compile();

    larkClient = module.get<LarkClient>(LarkClient);

    // Replace the wsClient with our mock (already initialized in constructor)
    (larkClient as any).wsClient = {
      close: mockWsClientClose,
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleDestroy', () => {
    it('should close the WSClient when onModuleDestroy is called', async () => {
      await larkClient.onModuleDestroy();
      expect(mockWsClientClose).toHaveBeenCalledTimes(1);
    });

    it('should not throw when wsClient is already closed', async () => {
      mockWsClientClose.mockImplementation(() => {
        // Simulate close throwing no error
      });
      await expect(larkClient.onModuleDestroy()).resolves.not.toThrow();
    });
  });
});
