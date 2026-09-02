import * as ExcelJS from 'exceljs';
import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  adminUserListSelect,
  AdminUserListRecord,
  AdminUserRepository,
  AdminUserRecord,
} from './user.repository';
import { AdminUserService } from './user.service';

const userRecord = (
  overrides: Partial<AdminUserRecord> = {},
): AdminUserRecord => ({
  id: 'cm12345678901234567890123',
  username: 'alice',
  email: 'alice@example.com',
  countryCode: '+86',
  phone: '13800138000',
  active: true,
  emailVerifiedAt: null,
  phoneVerifiedAt: null,
  lastLoginAt: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  profile: {
    displayName: 'Alice',
    avatar: null,
    bio: null,
    fullName: null,
    dateOfBirth: null,
    gender: null,
    address: null,
    city: null,
    country: null,
    zipCode: null,
    website: null,
  },
  ...overrides,
});

const userListRecord = (
  overrides: Partial<AdminUserListRecord> = {},
): AdminUserListRecord => ({
  id: 'cm12345678901234567890123',
  username: 'alice',
  email: 'alice@example.com',
  countryCode: '+86',
  phone: '13800138000',
  active: true,
  emailVerifiedAt: new Date('2026-01-01T00:00:00Z'),
  phoneVerifiedAt: null,
  lastLoginAt: new Date('2026-01-02T00:00:00Z'),
  createdAt: new Date('2026-01-01T00:00:00Z'),
  profile: {
    displayName: 'Alice',
    fullName: 'Alice',
    avatar: 'https://example.com/avatar.png',
  },
  ...overrides,
});

describe('AdminUserService', () => {
  let repository: jest.Mocked<AdminUserRepository>;
  let service: AdminUserService;

  beforeEach(() => {
    repository = {
      list: jest.fn(),
      findById: jest.fn(),
      findConflict: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    } as unknown as jest.Mocked<AdminUserRepository>;
    service = new AdminUserService(repository);
  });

  it('returns only fields required by the user list', async () => {
    repository.list.mockResolvedValue({ items: [userListRecord()], total: 1 });

    const result = await service.list({
      page: 1,
      pageSize: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    expect(result.items[0]).toEqual({
      id: 'cm12345678901234567890123',
      username: 'alice',
      email: 'alice@example.com',
      countryCode: '+86',
      phone: '13800138000',
      displayName: 'Alice',
      avatar: 'https://example.com/avatar.png',
      active: true,
      emailVerified: true,
      phoneVerified: false,
      lastLoginAt: new Date('2026-01-02T00:00:00Z'),
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });
    expect(result.items[0]).not.toHaveProperty('profile');
    expect(result.items[0]).not.toHaveProperty('updatedAt');
  });

  it('does not select detailed profile fields for the user list', () => {
    expect(adminUserListSelect.profile.select).toEqual({
      displayName: true,
      avatar: true,
    });
  });

  it('keeps the complete profile on the user detail endpoint', async () => {
    const record = userRecord({
      profile: {
        ...userRecord().profile!,
        bio: '个人简介',
        dateOfBirth: new Date('2000-01-02T00:00:00.000Z'),
        address: '上海市',
      },
    });
    repository.findById.mockResolvedValue(record);

    const result = await service.getById(record.id);

    expect(result.profile).toEqual(record.profile);
    expect(result.updatedAt).toEqual(record.updatedAt);
  });

  it('creates a normalized user without exposing verification timestamps', async () => {
    repository.findConflict.mockResolvedValue(null);
    repository.create.mockResolvedValue(userRecord());

    const result = await service.create({
      email: ' Alice@Example.COM ',
      countryCode: '86',
      phone: '138 0013 8000',
      displayName: ' Alice ',
      fullName: ' Alice Smith ',
    });

    expect(repository.create.mock.calls[0][0]).toEqual({
      email: 'alice@example.com',
      countryCode: '+86',
      phone: '13800138000',
      displayName: 'Alice',
      fullName: 'Alice Smith',
    });
    expect(result.emailVerified).toBe(false);
    expect(result).not.toHaveProperty('emailVerifiedAt');
  });

  it('rejects users without a login identifier', async () => {
    await expect(
      service.create({ displayName: 'No identifier' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns a conflict for a duplicate email', async () => {
    repository.findConflict.mockResolvedValue({
      id: 'other',
      username: 'mock_username',
      email: 'alice@example.com',
      countryCode: null,
      phone: null,
    });

    await expect(
      service.create({ email: 'alice@example.com' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('updates account and profile fields in one repository call', async () => {
    repository.findById.mockResolvedValue(userRecord());
    repository.findConflict.mockResolvedValue(null);
    repository.update.mockResolvedValue(
      userRecord({
        profile: {
          ...userRecord().profile!,
          bio: '个人简介',
          gender: 'FEMALE',
          dateOfBirth: new Date('2000-01-02T00:00:00.000Z'),
        },
      }),
    );

    await service.update('cm12345678901234567890123', {
      bio: ' 个人简介 ',
      gender: 'FEMALE',
      dateOfBirth: '2000-01-02',
      city: ' 上海 ',
    });

    expect(repository.update.mock.calls[0][1]).toEqual({
      bio: '个人简介',
      gender: 'FEMALE',
      dateOfBirth: new Date('2000-01-02T00:00:00.000Z'),
      city: '上海',
    });
  });

  it('imports CSV rows independently and reports masked failures', async () => {
    repository.findConflict.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 'existing',
      username: 'mock_username',
      email: 'duplicate@example.com',
      countryCode: null,
      phone: null,
    });
    repository.create.mockResolvedValue(userRecord());
    const csv = Buffer.from(
      '邮箱,国家代码,手机号,显示名称,姓名,是否启用\nnew@example.com,+86,13800138001,新用户,张三,是\nduplicate@example.com,,,,,否\n',
    );

    const result = await service.importUsers({
      originalname: 'users.csv',
      mimetype: 'text/csv',
      size: csv.length,
      buffer: csv,
    });

    expect(result).toMatchObject({
      total: 2,
      successCount: 1,
      failureCount: 1,
    });
    expect(result.failures[0]).toMatchObject({ row: 3, code: 'CONFLICT' });
    expect(result.failures[0].identifier).toBe('du***@example.com');
    expect(repository.create.mock.calls[0][0]).toMatchObject({
      displayName: '新用户',
      fullName: '张三',
    });
  });

  it('imports the first worksheet from an XLSX file', async () => {
    repository.findConflict.mockResolvedValue(null);
    repository.create.mockResolvedValue(userRecord());
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('用户');
    sheet.addRow(['username', 'email', 'active']);
    sheet.addRow(['bob', 'bob@example.com', false]);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

    const result = await service.importUsers({
      originalname: 'users.xlsx',
      mimetype:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: buffer.length,
      buffer,
    });

    expect(result).toMatchObject({
      total: 1,
      successCount: 1,
      failureCount: 0,
    });
    expect(repository.create.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        username: 'bob',
        email: 'bob@example.com',
        active: false,
      }),
    );
  });

  it('preserves names from legacy split-name import templates', async () => {
    repository.findConflict.mockResolvedValue(null);
    repository.create.mockResolvedValue(userRecord());
    const csv = Buffer.from(
      'email,displayName,firstName,lastName\nzhang@example.com,张三,三,张\nalice@example.com,Alice,Alice,Smith\n',
    );

    await service.importUsers({
      originalname: 'legacy-users.csv',
      mimetype: 'text/csv',
      size: csv.length,
      buffer: csv,
    });

    expect(repository.create.mock.calls[0][0]).toMatchObject({
      email: 'zhang@example.com',
      fullName: '张三',
    });
    expect(repository.create.mock.calls[1][0]).toMatchObject({
      email: 'alice@example.com',
      fullName: 'Alice Smith',
    });
  });

  it('reports invalid email syntax as a row failure', async () => {
    const csv = Buffer.from('email\nnot-an-email\n');

    const result = await service.importUsers({
      originalname: 'users.csv',
      mimetype: 'text/csv',
      size: csv.length,
      buffer: csv,
    });

    expect(result).toMatchObject({
      total: 1,
      successCount: 0,
      failureCount: 1,
    });
    expect(result.failures[0].code).toBe('INVALID_DATA');
    expect(repository.create.mock.calls).toHaveLength(0);
  });

  it('rejects malformed CSV files as a bad request', async () => {
    const csv = Buffer.from('email\n"unterminated\n');

    await expect(
      service.importUsers({
        originalname: 'users.csv',
        mimetype: 'text/csv',
        size: csv.length,
        buffer: csv,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
