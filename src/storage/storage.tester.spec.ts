/* eslint-disable @typescript-eslint/unbound-method */
import { BadRequestException } from '@nestjs/common';
import { StorageTesterService } from './storage.tester';
import { IntegrationTesterService } from '@/admin/integrations';

jest.mock('ali-oss', () => {
  return jest.fn().mockImplementation((options: { bucket: string }) => {
    if (options.bucket === 'invalid-bucket') {
      return {
        getBucketInfo: jest.fn().mockRejectedValue(new Error('NoSuchBucket')),
      };
    }
    return {
      getBucketInfo: jest.fn().mockResolvedValue({ bucket: options.bucket }),
    };
  });
});

describe('StorageTesterService', () => {
  let testerService: jest.Mocked<IntegrationTesterService>;
  let storageTester: StorageTesterService;

  beforeEach(() => {
    testerService = {
      registerProvider: jest.fn(),
    } as unknown as jest.Mocked<IntegrationTesterService>;
    storageTester = new StorageTesterService(testerService);
  });

  it('registers itself onModuleInit', () => {
    storageTester.onModuleInit();
    expect(testerService.registerProvider).toHaveBeenCalledWith(
      'storage',
      storageTester,
    );
  });

  it('throws BadRequestException when required fields are missing', async () => {
    await expect(
      storageTester.test({
        region: 'oss-cn-hangzhou',
        bucket: '',
        accessKeyId: 'ak',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('passes when bucket connection succeeds', async () => {
    await expect(
      storageTester.test({
        region: 'oss-cn-hangzhou',
        bucket: 'valid-bucket',
        accessKeyId: 'ak',
        accessKeySecret: 'sk',
      }),
    ).resolves.toBeUndefined();
  });

  it('throws BadRequestException when OSS returns an error', async () => {
    await expect(
      storageTester.test({
        region: 'oss-cn-hangzhou',
        bucket: 'invalid-bucket',
        accessKeyId: 'ak',
        accessKeySecret: 'sk',
      }),
    ).rejects.toThrow(/OSS 连通性测试失败: NoSuchBucket/);
  });

  it('passes when both private bucket and public bucket succeed', async () => {
    await expect(
      storageTester.test({
        region: 'oss-cn-hangzhou',
        bucket: 'valid-bucket',
        publicBucket: 'valid-public-bucket',
        accessKeyId: 'ak',
        accessKeySecret: 'sk',
      }),
    ).resolves.toBeUndefined();
  });

  it('throws BadRequestException when public bucket test fails', async () => {
    await expect(
      storageTester.test({
        region: 'oss-cn-hangzhou',
        bucket: 'valid-bucket',
        publicBucket: 'invalid-bucket',
        accessKeyId: 'ak',
        accessKeySecret: 'sk',
      }),
    ).rejects.toThrow(/OSS 连通性测试失败: 公共存储桶 NoSuchBucket/);
  });
});
