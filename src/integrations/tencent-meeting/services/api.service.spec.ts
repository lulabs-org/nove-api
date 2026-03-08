import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TencentApiService } from './api.service';
import { tencentMeetingConfig } from '@/configs';

type TMConfig = {
  secretId: string;
  secretKey: string;
  appId: string;
  sdkId: string;
  userId: string;
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, string> = {
      TENCENT_MEETING_SECRET_ID: 'mock-secret-id',
      TENCENT_MEETING_SECRET_KEY: 'mock-secret-key',
      TENCENT_MEETING_APP_ID: 'mock-app-id',
      TENCENT_MEETING_SDK_ID: 'mock-sdk-id',
      USER_ID: 'mock-user-id',
    };
    return config[key];
  }),
};

const mockTencentMeetingConfig = {
  webhook: {
    token: 'mock-token',
    encodingAesKey: 'mock-encoding-aes-key',
  },
  api: {
    secretId: 'mock-secret-id',
    secretKey: 'mock-secret-key',
    appId: 'mock-app-id',
    sdkId: 'mock-sdk-id',
    userId: 'mock-user-id',
  },
};

global.fetch = jest.fn();

jest.mock('./crypto.util', () => ({
  generateSignature: jest.fn(() => 'mock-signature'),
}));

const jsonResponse = (data: unknown) => ({
  json: jest.fn().mockResolvedValueOnce(data),
});

describe('TencentApiService', () => {
  let service: TencentApiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TencentApiService,
        { provide: ConfigService, useValue: mockConfigService },
        {
          provide: tencentMeetingConfig.KEY,
          useValue: mockTencentMeetingConfig,
        },
      ],
    }).compile();

    service = module.get<TencentApiService>(TencentApiService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getConfig', () => {
    it('returns correct config', () => {
      const getConfig = Reflect.get(service as object, 'getConfig') as (
        this: TencentApiService,
      ) => TMConfig;
      const config: TMConfig = getConfig.call(service) as unknown as TMConfig;
      expect(config).toEqual({
        secretId: 'mock-secret-id',
        secretKey: 'mock-secret-key',
        appId: 'mock-app-id',
        sdkId: 'mock-sdk-id',
        userId: 'mock-user-id',
      });
    });
  });

  describe('getRecordingFileDetail', () => {
    it('should return recording details successfully', async () => {
      const mockResponse = {
        record_file_id: 'test-file-id',
        meeting_id: 'test-meeting-id',
        meeting_code: '123456789',
        subject: 'Test Meeting',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(
        jsonResponse(mockResponse),
      );

      const result = await service.getRecordingFileDetail(
        'test-file-id',
        'test-user-id',
      );

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/addresses/test-file-id'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-TC-Key': 'mock-secret-id',
            'X-TC-Signature': 'mock-signature',
          }) as unknown as Record<string, unknown>,
        }) as unknown as Record<string, unknown>,
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors', async () => {
      const mockError = {
        error_info: { error_code: 108004051, message: '录制文件已经被删除' },
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        jsonResponse(mockError),
      );
      await expect(
        service.getRecordingFileDetail('deleted-file-id', 'test-user-id'),
      ).rejects.toThrow('录制文件已经被删除');
    });

    it('should handle IP whitelist error', async () => {
      const mockError = {
        error_info: { error_code: 500125, message: 'IP未在白名单' },
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        jsonResponse(mockError),
      );
      await expect(
        service.getRecordingFileDetail('test-file-id', 'test-user-id'),
      ).rejects.toThrow('IP白名单错误');
    });
  });

  describe('getCorpRecords', () => {
    it('returns meeting records', async () => {
      const mockResponse = {
        total_count: 2,
        current_page: 1,
        total_page: 1,
        record_meetings: [],
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        jsonResponse(mockResponse),
      );

      const startTime = Math.floor(new Date('2024-01-01').getTime() / 1000);
      const endTime = Math.floor(new Date('2024-01-31').getTime() / 1000);
      const result = await service.getCorpRecords(startTime, endTime, 10, 1);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/corp/records'),
        expect.objectContaining({ method: 'GET' }),
      );
      expect(result).toEqual(mockResponse);
    });

    it('validates time range (max 31 days)', async () => {
      const startTime = Math.floor(new Date('2024-01-01').getTime() / 1000);
      const endTime = Math.floor(new Date('2024-02-15').getTime() / 1000);
      await expect(service.getCorpRecords(startTime, endTime)).rejects.toThrow(
        '时间区间不允许超过31天',
      );
    });

    it('limits page size to max 20', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        jsonResponse({ total_count: 0, record_meetings: [] }),
      );
      const startTime = Math.floor(new Date('2024-01-01').getTime() / 1000);
      const endTime = Math.floor(new Date('2024-01-02').getTime() / 1000);
      await service.getCorpRecords(startTime, endTime, 50, 1);
      const calls = (global.fetch as jest.Mock).mock.calls as Array<
        [unknown, unknown?]
      >;
      const fetchCall = String(calls[0]?.[0]);
      expect(fetchCall).toContain('page_size=20');
    });
  });

  describe('getSmartFullSummary', () => {
    it('should return smart full summary successfully', async () => {
      const mockResponse = {
        ai_summary:
          '5Lya6K6u5Li76KaB6K6y6L+w5LqG5Zyo5aSE5xxxxxxxxxxxxxxxxxxx6c77yM6ICM5piv6KaB5Li75Yqo5Y676Kej5Yaz6Zeu6aKY44CC',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(
        jsonResponse(mockResponse),
      );

      const result = await service.getSmartFullSummary(
        'test-record-file-id',
        'test-operator-id',
        1,
        'zh',
        'test-password',
      );

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/smart/fullsummary'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-TC-Key': 'mock-secret-id',
            'X-TC-Signature': 'mock-signature',
          }) as unknown as Record<string, unknown>,
        }) as unknown as Record<string, unknown>,
      );

      // 验证URL参数
      const calls = (global.fetch as jest.Mock).mock.calls as Array<
        [unknown, unknown?]
      >;
      const fetchCall = String(calls[0]?.[0]);
      expect(fetchCall).toContain('record_file_id=test-record-file-id');
      expect(fetchCall).toContain('operator_id=test-operator-id');
      expect(fetchCall).toContain('operator_id_type=1');
      expect(fetchCall).toContain('lang=zh');
      expect(fetchCall).toContain('pwd=test-password');

      expect(result).toEqual(mockResponse);
    });

    it('should work with minimal parameters', async () => {
      const mockResponse = {
        ai_summary:
          '5Lya6K6u5Li76KaB6K6y6L+w5LqG5Zyo5aSE5xxxxxxxxxxxxxxxxxxx6c77yM6ICM5piv6KaB5Li75Yqo5Y676Kej5Yaz6Zeu6aKY44CC',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce(
        jsonResponse(mockResponse),
      );

      const result = await service.getSmartFullSummary(
        'test-record-file-id',
        'test-operator-id',
      );

      const calls = (global.fetch as jest.Mock).mock.calls as Array<
        [unknown, unknown?]
      >;
      const fetchCall = String(calls[0]?.[0]);
      expect(fetchCall).toContain('record_file_id=test-record-file-id');
      expect(fetchCall).toContain('operator_id=test-operator-id');
      expect(fetchCall).toContain('operator_id_type=1');
      expect(fetchCall).not.toContain('lang=');
      expect(fetchCall).not.toContain('pwd=');

      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors', async () => {
      const mockError = {
        error_info: { error_code: 108004051, message: '录制文件已经被删除' },
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce(
        jsonResponse(mockError),
      );
      await expect(
        service.getSmartFullSummary('test-record-file-id', 'test-operator-id'),
      ).rejects.toThrow('录制文件已经被删除');
    });
  });
});
