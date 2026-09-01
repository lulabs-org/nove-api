/**
 * @fileoverview Unit tests for NumberRecordBitableRepository
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NumberRecordBitableRepository } from './number-record.repository';
import { BitableService } from '../services/bitable.service';
import { larkConfig } from '../../../configs/lark.config';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { SystemConfigService } from '@/admin/system-config/services/system-config.service';

// Mock config
const mockConfig: ConfigType<typeof larkConfig> = {
  appId: 'test-app-id',
  appSecret: 'test-app-secret',
  logLevel: 'info' as const,
  baseUrl: 'https://example.com',
  bitable: {
    appToken: 'test-app-token',
    tableIds: {
      meeting: 'test-meeting-table-id',
      meetingUser: 'test-meeting-user-table-id',
      recordingFile: 'test-recording-file-table-id',
      numberRecord: 'test-number-record-table-id',
    },
  },
  event: {
    encryptKey: 'test-encrypt-key',
    verificationToken: 'test-verification-token',
  },
};

describe('NumberRecordBitableRepository', () => {
  let repository: NumberRecordBitableRepository;
  let bitableService: jest.Mocked<BitableService>;

  beforeEach(async () => {
    const mockBitableService = {
      createRecord: jest.fn(),
      upsertRecord: jest.fn(),
      searchRecords: jest.fn(),
      updateRecord: jest.fn(),
    } as unknown as jest.Mocked<BitableService>;

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => mockConfig],
        }),
      ],
      providers: [
        NumberRecordBitableRepository,
        {
          provide: BitableService,
          useValue: mockBitableService,
        },
        {
          provide: larkConfig.KEY,
          useValue: mockConfig,
        },
        {
          provide: SystemConfigService,
          useValue: {
            getEffectiveConfig: jest.fn().mockResolvedValue({
              value: {
                bitableAppToken: mockConfig.bitable.appToken,
                personalSummaryTableId:
                  mockConfig.bitable.tableIds.numberRecord,
              },
            }),
          },
        },
      ],
    }).compile();

    repository = module.get<NumberRecordBitableRepository>(
      NumberRecordBitableRepository,
    );
    await repository.onModuleInit();
    bitableService = module.get(BitableService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('constructor', () => {
    it('allows missing environment config so database config can load later', () => {
      const mockBitableService = {
        createRecord: jest.fn(),
        upsertRecord: jest.fn(),
        searchRecords: jest.fn(),
        updateRecord: jest.fn(),
      } as unknown as BitableService;

      expect(
        () =>
          new NumberRecordBitableRepository(
            mockBitableService,
            {} as SystemConfigService,
          ),
      ).not.toThrow();
    });
  });

  describe('createNumberRecord', () => {
    it('should create a new number record', async () => {
      const mockRecordData = {
        meet_participant: ['user123', '张三'],
        participant_summary: '这是参会者的个性化会议总结',
        record_file: ['https://example.com/records/rec123.mp3'],
      };

      const mockResponse = {
        code: 0,
        msg: 'success',
        data: {
          record: {
            record_id: 'rec123',
            fields: mockRecordData,
            created_by: { id: 'user123', name: 'Test User' },
            created_time: Date.now(),
            last_modified_by: { id: 'user123', name: 'Test User' },
            last_modified_time: Date.now(),
          },
        },
      };

      bitableService.createRecord.mockResolvedValue(mockResponse);

      const result = await repository.createNumberRecord(mockRecordData);

      expect(bitableService['createRecord']).toHaveBeenCalledWith(
        'test-app-token',
        'test-number-record-table-id',
        {
          meet_participant: mockRecordData.meet_participant,
          participant_summary: mockRecordData.participant_summary,
          record_file: mockRecordData.record_file,
        },
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('upsertNumberRecord', () => {
    it('should upsert a number record', async () => {
      const mockRecordData = {
        meet_participant: ['user456', '李四'],
        participant_summary: '这是另一个参会者的个性化会议总结',
        record_file: ['https://example.com/records/rec456.mp3'],
      };

      const mockUpsertResult = {
        action: 'created' as const,
        record: {
          record_id: 'rec456',
          fields: mockRecordData,
          created_by: { id: 'user456', name: 'Test User' },
          created_time: Date.now(),
          last_modified_by: { id: 'user456', name: 'Test User' },
          last_modified_time: Date.now(),
        },
        recordId: 'rec456',
      };

      bitableService.upsertRecord.mockResolvedValue(mockUpsertResult);

      const result = await repository.upsertNumberRecord(mockRecordData);

      expect(bitableService['upsertRecord']).toHaveBeenCalledWith(
        'test-app-token',
        'test-number-record-table-id',
        {
          meet_participant: mockRecordData.meet_participant,
          participant_summary: mockRecordData.participant_summary,
          record_file: mockRecordData.record_file,
        },
        {
          matchFields: ['meet_participant'],
          matchMode: 'partial',
          caseSensitive: false,
        },
        {
          mergeFields: false,
          returnFullRecord: true,
        },
      );
      expect(result).toEqual({
        code: 0,
        msg: 'success',
        data: {
          record: mockUpsertResult.record,
        },
      });
    });

    it('should rethrow errors from the service', async () => {
      const mockRecordData = {
        meet_participant: ['user456', '李四'],
        participant_summary: '这是另一个参会者的个性化会议总结',
        record_file: ['https://example.com/records/rec456.mp3'],
      };

      const error = new Error('upsert failed');
      bitableService.upsertRecord.mockRejectedValue(error);

      await expect(
        repository.upsertNumberRecord(mockRecordData),
      ).rejects.toThrow(error);
    });
  });

  describe('searchNumberRecordByParticipants', () => {
    it('should search records by participants', async () => {
      const participants = ['user789', '王五'];
      const mockSearchResult = {
        code: 0,
        msg: 'success',
        data: {
          items: [
            {
              record_id: 'rec789',
              fields: {
                meet_participant: participants,
                participant_summary: '测试总结',
                record_file: ['https://example.com/records/rec789.mp3'],
              },
              created_by: { id: 'user789', name: 'Test User' },
              created_time: Date.now(),
              last_modified_by: { id: 'user789', name: 'Test User' },
              last_modified_time: Date.now(),
            },
          ],
          has_more: false,
          total: 1,
        },
      };

      bitableService.searchRecords.mockResolvedValue(mockSearchResult);

      const result =
        await repository.searchNumberRecordByParticipants(participants);

      expect(bitableService['searchRecords']).toHaveBeenCalledWith(
        'test-app-token',
        'test-number-record-table-id',
        {
          filter: {
            conjunction: 'and',
            conditions: [
              {
                field_name: 'meet_participant',
                operator: 'is',
                value: participants,
              },
            ],
          },
        },
      );
      expect(result).toEqual(mockSearchResult);
    });

    it('should rethrow errors from the service', async () => {
      const participants = ['user789', '王五'];
      const error = new Error('search failed');

      bitableService.searchRecords.mockRejectedValue(error);

      await expect(
        repository.searchNumberRecordByParticipants(participants),
      ).rejects.toThrow(error);
    });
  });

  describe('updateNumberRecordById', () => {
    it('should update a number record by ID', async () => {
      const recordId = 'rec123';
      const updateData = {
        meet_participant: ['user123', '张三'],
        participant_summary: '更新的参会者总结',
        record_file: ['https://example.com/records/updated-rec123.mp3'],
      };

      const mockUpdateResult = {
        code: 0,
        msg: 'success',
        data: {
          record: {
            record_id: recordId,
            fields: updateData,
            created_by: { id: 'user123', name: 'Test User' },
            created_time: Date.now(),
            last_modified_by: { id: 'user123', name: 'Test User' },
            last_modified_time: Date.now(),
          },
        },
      };

      bitableService.updateRecord.mockResolvedValue(mockUpdateResult);

      const result = await repository.updateNumberRecordById(
        recordId,
        updateData,
      );

      expect(bitableService['updateRecord']).toHaveBeenCalledWith(
        'test-app-token',
        'test-number-record-table-id',
        recordId,
        {
          meet_participant: updateData.meet_participant,
          participant_summary: updateData.participant_summary,
          record_file: updateData.record_file,
        },
      );
      expect(result).toEqual(mockUpdateResult);
    });

    it('should rethrow errors from the service', async () => {
      const recordId = 'rec123';
      const error = new Error('update failed');

      bitableService.updateRecord.mockRejectedValue(error);

      await expect(
        repository.updateNumberRecordById(recordId, {}),
      ).rejects.toThrow(error);
    });

    it('should omit undefined fields when updating', async () => {
      const recordId = 'rec999';
      const updateData = {
        participant_summary: '仅更新总结',
      };

      bitableService.updateRecord.mockResolvedValue({
        code: 0,
        msg: 'success',
        data: { record: { record_id: recordId, fields: updateData } },
      } as never);

      await repository.updateNumberRecordById(recordId, updateData);

      expect(bitableService['updateRecord']).toHaveBeenCalledWith(
        'test-app-token',
        'test-number-record-table-id',
        recordId,
        {
          participant_summary: updateData.participant_summary,
        },
      );
    });
  });
});
