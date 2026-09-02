import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Gender } from '@prisma/client';
import { parse } from 'csv-parse/sync';
import * as ExcelJS from 'exceljs';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  AdminUserDto,
  AdminUserListItemDto,
  AdminUserListResponseDto,
  CreateAdminUserDto,
  QueryUsersDto,
  UpdateAdminUserDto,
  UserImportFailureDto,
  UserImportResponseDto,
} from './dto';
import {
  AdminUserRecord,
  AdminUserListRecord,
  AdminUserRepository,
  AdminUserWriteData,
} from './user.repository';

const MAX_IMPORT_ROWS = 5000;
const HEADER_ALIASES: Record<string, keyof ImportRow> = {
  username: 'username',
  用户名: 'username',
  email: 'email',
  邮箱: 'email',
  countrycode: 'countryCode',
  国家代码: 'countryCode',
  区号: 'countryCode',
  phone: 'phone',
  手机号: 'phone',
  手机: 'phone',
  displayname: 'displayName',
  显示名称: 'displayName',
  avatar: 'avatar',
  头像: 'avatar',
  bio: 'bio',
  个人简介: 'bio',
  fullName: 'fullName',
  fullname: 'fullName',
  完整姓名: 'fullName',
  姓名: 'fullName',
  firstName: 'firstName',
  firstname: 'firstName',
  名: 'firstName',
  lastName: 'lastName',
  lastname: 'lastName',
  姓: 'lastName',
  dateOfBirth: 'dateOfBirth',
  dateofbirth: 'dateOfBirth',
  出生日期: 'dateOfBirth',
  gender: 'gender',
  性别: 'gender',
  address: 'address',
  地址: 'address',
  city: 'city',
  城市: 'city',
  country: 'country',
  国家: 'country',
  zipCode: 'zipCode',
  zipcode: 'zipCode',
  邮政编码: 'zipCode',
  website: 'website',
  个人网站: 'website',
  active: 'active',
  状态: 'active',
  是否启用: 'active',
};

interface UploadFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

interface ImportRow {
  username?: unknown;
  email?: unknown;
  countryCode?: unknown;
  phone?: unknown;
  displayName?: unknown;
  avatar?: unknown;
  bio?: unknown;
  fullName?: unknown;
  firstName?: unknown;
  lastName?: unknown;
  dateOfBirth?: unknown;
  gender?: unknown;
  address?: unknown;
  city?: unknown;
  country?: unknown;
  zipCode?: unknown;
  website?: unknown;
  active?: unknown;
}

@Injectable()
export class AdminUserService {
  constructor(private readonly repository: AdminUserRepository) {}

  async list(dto: QueryUsersDto): Promise<AdminUserListResponseDto> {
    const { page = 1, pageSize = 20, keyword, active } = dto;
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(active !== undefined ? { active } : {}),
      ...(keyword
        ? {
            OR: [
              { username: { contains: keyword, mode: 'insensitive' } },
              { email: { contains: keyword, mode: 'insensitive' } },
              { phone: { contains: keyword } },
              {
                profile: {
                  is: {
                    displayName: { contains: keyword, mode: 'insensitive' },
                  },
                },
              },
              {
                profile: {
                  is: {
                    fullName: { contains: keyword, mode: 'insensitive' },
                  },
                },
              },
            ],
          }
        : {}),
    };
    const { items, total } = await this.repository.list({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { [dto.sortBy ?? 'createdAt']: dto.sortOrder ?? 'desc' },
    });
    return {
      items: items.map((item) => this.toListItemDto(item)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getById(id: string): Promise<AdminUserDto> {
    const user = await this.repository.findById(id);
    if (!user) throw new NotFoundException('用户不存在');
    return this.toDto(user);
  }

  async create(dto: CreateAdminUserDto): Promise<AdminUserDto> {
    const data = this.normalize(dto);
    this.validateIdentifiers(data);
    await this.ensureNoConflict(data);
    try {
      return this.toDto(await this.repository.create(data));
    } catch (error) {
      this.rethrowPrismaError(error);
    }
  }

  async update(id: string, dto: UpdateAdminUserDto): Promise<AdminUserDto> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new NotFoundException('用户不存在');
    const data = this.normalize(dto);
    const merged = {
      username: data.username !== undefined ? data.username : existing.username,
      email: data.email !== undefined ? data.email : existing.email,
      countryCode:
        data.countryCode !== undefined
          ? data.countryCode
          : existing.countryCode,
      phone: data.phone !== undefined ? data.phone : existing.phone,
    };
    this.validateIdentifiers(merged);
    await this.ensureNoConflict(data, id);
    try {
      return this.toDto(await this.repository.update(id, data));
    } catch (error) {
      this.rethrowPrismaError(error);
    }
  }

  async delete(id: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) throw new NotFoundException('用户不存在');
    await this.repository.softDelete(id);
  }

  async importUsers(file?: UploadFile): Promise<UserImportResponseDto> {
    if (!file) throw new BadRequestException('请选择要导入的文件');
    const rows = await this.parseFile(file);
    if (!rows.length) throw new BadRequestException('导入文件中没有用户数据');
    if (rows.length > MAX_IMPORT_ROWS) {
      throw new BadRequestException(
        `单次最多导入 ${MAX_IMPORT_ROWS} 条用户数据`,
      );
    }

    const failures: UserImportFailureDto[] = [];
    let successCount = 0;
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const rowNumber = index + 2;
      try {
        const dto = this.rowToDto(row);
        await this.validateImportDto(dto);
        await this.create(dto);
        successCount += 1;
      } catch (error) {
        failures.push({
          row: rowNumber,
          identifier: this.maskIdentifier(row),
          code: this.errorCode(error),
          reason: this.errorMessage(error),
        });
      }
    }
    return {
      total: rows.length,
      successCount,
      failureCount: failures.length,
      failures,
    };
  }

  private normalize(
    dto: CreateAdminUserDto | UpdateAdminUserDto,
  ): AdminUserWriteData {
    const phone = dto.phone?.replace(/\D/g, '') || undefined;
    const countryCode = dto.countryCode
      ? dto.countryCode.startsWith('+')
        ? dto.countryCode
        : `+${dto.countryCode}`
      : undefined;
    return {
      ...(dto.username !== undefined
        ? { username: dto.username?.trim() || undefined }
        : {}),
      ...(dto.email !== undefined
        ? { email: dto.email?.trim().toLowerCase() || null }
        : {}),
      ...(dto.countryCode !== undefined
        ? { countryCode: countryCode ?? null }
        : {}),
      ...(dto.phone !== undefined ? { phone: phone ?? null } : {}),
      ...(dto.displayName !== undefined
        ? { displayName: dto.displayName?.trim() || null }
        : {}),
      ...(dto.avatar !== undefined
        ? { avatar: dto.avatar?.trim() || null }
        : {}),
      ...(dto.bio !== undefined ? { bio: dto.bio?.trim() || null } : {}),
      ...(dto.fullName !== undefined
        ? { fullName: dto.fullName?.trim() || null }
        : {}),
      ...(dto.dateOfBirth !== undefined
        ? {
            dateOfBirth: dto.dateOfBirth
              ? new Date(`${dto.dateOfBirth.slice(0, 10)}T00:00:00.000Z`)
              : null,
          }
        : {}),
      ...(dto.gender !== undefined ? { gender: dto.gender } : {}),
      ...(dto.address !== undefined
        ? { address: dto.address?.trim() || null }
        : {}),
      ...(dto.city !== undefined ? { city: dto.city?.trim() || null } : {}),
      ...(dto.country !== undefined
        ? { country: dto.country?.trim() || null }
        : {}),
      ...(dto.zipCode !== undefined
        ? { zipCode: dto.zipCode?.trim() || null }
        : {}),
      ...(dto.website !== undefined
        ? { website: dto.website?.trim() || null }
        : {}),
      ...(dto.active !== undefined ? { active: dto.active } : {}),
    };
  }

  private validateIdentifiers(data: AdminUserWriteData): void {
    if (!data.username && !data.email && !data.phone) {
      throw new BadRequestException('用户名、邮箱、手机号至少填写一个');
    }
    if (data.phone && !data.countryCode) {
      throw new BadRequestException('填写手机号时必须提供国家代码');
    }
    if (data.countryCode && !data.phone) {
      throw new BadRequestException('填写国家代码时必须提供手机号');
    }
  }

  private async ensureNoConflict(data: AdminUserWriteData, excludeId?: string) {
    const conflict = await this.repository.findConflict(data, excludeId);
    if (!conflict) return;
    if (data.username && conflict.username === data.username) {
      throw new ConflictException('用户名已存在');
    }
    if (data.email && conflict.email === data.email) {
      throw new ConflictException('邮箱已存在');
    }
    throw new ConflictException('手机号已存在');
  }

  private async parseFile(file: UploadFile): Promise<ImportRow[]> {
    const extension = file.originalname.split('.').pop()?.toLowerCase();
    if (extension === 'csv') {
      try {
        const records = parse<Record<string, unknown>>(file.buffer, {
          bom: true,
          columns: true,
          skip_empty_lines: true,
          trim: true,
          relax_column_count: true,
        });
        return records.map((record) => this.mapHeaders(record));
      } catch {
        throw new BadRequestException('CSV 文件格式无效或已损坏');
      }
    }
    if (extension === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      try {
        const bytes = Uint8Array.from(file.buffer);
        await workbook.xlsx.load(bytes.buffer);
      } catch {
        throw new BadRequestException('Excel 文件格式无效或已损坏');
      }
      const worksheet = workbook.worksheets[0];
      if (!worksheet) return [];
      const headers = (worksheet.getRow(1).values as unknown[]).slice(1);
      const result: ImportRow[] = [];
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return;
        const raw: Record<string, unknown> = {};
        headers.forEach((header, columnIndex) => {
          raw[this.cellText(header)] = this.cellText(
            row.getCell(columnIndex + 1).value,
          );
        });
        if (Object.values(raw).some((value) => value !== '')) {
          result.push(this.mapHeaders(raw));
        }
      });
      return result;
    }
    throw new BadRequestException('仅支持 CSV 或 XLSX 文件');
  }

  private mapHeaders(record: Record<string, unknown>): ImportRow {
    const mapped: ImportRow = {};
    for (const [rawHeader, value] of Object.entries(record)) {
      const normalized = rawHeader
        .trim()
        .toLowerCase()
        .replace(/[\s_-]/g, '');
      const key =
        HEADER_ALIASES[normalized] ?? HEADER_ALIASES[rawHeader.trim()];
      if (key) mapped[key] = value;
    }
    return mapped;
  }

  private rowToDto(row: ImportRow): CreateAdminUserDto {
    const text = (value: unknown) => this.primitiveText(value) || undefined;
    const displayName = text(row.displayName);
    const fullName =
      text(row.fullName) ??
      this.composeLegacyFullName(
        text(row.firstName),
        text(row.lastName),
        displayName,
      );
    return {
      username: text(row.username),
      email: text(row.email)?.toLowerCase(),
      countryCode: text(row.countryCode),
      phone: text(row.phone),
      displayName,
      avatar: text(row.avatar),
      bio: text(row.bio),
      fullName,
      dateOfBirth: text(row.dateOfBirth),
      gender: this.parseGender(row.gender),
      address: text(row.address),
      city: text(row.city),
      country: text(row.country),
      zipCode: text(row.zipCode),
      website: text(row.website),
      active: this.parseActive(row.active),
    };
  }

  private composeLegacyFullName(
    firstName?: string,
    lastName?: string,
    displayName?: string,
  ): string | undefined {
    if (!firstName) return lastName;
    if (!lastName) return firstName;
    const candidates = [
      `${firstName}${lastName}`,
      `${lastName}${firstName}`,
      `${firstName} ${lastName}`,
      `${lastName} ${firstName}`,
    ];
    if (displayName && candidates.includes(displayName)) return displayName;
    return /[㐀-鿿ぁ-んァ-ン가-힣]/u.test(`${firstName}${lastName}`)
      ? `${lastName}${firstName}`
      : `${firstName} ${lastName}`;
  }

  private async validateImportDto(dto: CreateAdminUserDto): Promise<void> {
    const instance = plainToInstance(CreateAdminUserDto, dto);
    const errors = await validate(instance, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (!errors.length) return;
    const messages = errors.flatMap((error) =>
      Object.values(error.constraints ?? {}),
    );
    throw new BadRequestException(
      messages.length ? messages : '用户数据格式不正确',
    );
  }

  private parseActive(value: unknown): boolean | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'boolean') return value;
    const original = this.primitiveText(value);
    const normalized = original.toLowerCase();
    if (['true', '1', '是', '启用', 'active'].includes(normalized)) return true;
    if (['false', '0', '否', '停用', 'inactive'].includes(normalized))
      return false;
    throw new BadRequestException(`状态值“${original || '无法识别'}”无效`);
  }

  private parseGender(value: unknown): Gender | undefined {
    const normalized = this.primitiveText(value).toUpperCase();
    if (!normalized) return undefined;
    const aliases: Record<string, Gender> = {
      MALE: Gender.MALE,
      男: Gender.MALE,
      FEMALE: Gender.FEMALE,
      女: Gender.FEMALE,
      OTHER: Gender.OTHER,
      其他: Gender.OTHER,
      PREFER_NOT_TO_SAY: Gender.PREFER_NOT_TO_SAY,
      不愿透露: Gender.PREFER_NOT_TO_SAY,
    };
    return aliases[normalized] ?? (normalized as Gender);
  }

  private cellText(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'object') {
      const cell = value as {
        text?: string;
        result?: unknown;
        hyperlink?: string;
      };
      if (cell.text !== undefined) return cell.text;
      if (cell.result !== undefined) return this.primitiveText(cell.result);
      if (cell.hyperlink !== undefined) return cell.hyperlink;
      return '';
    }
    return this.primitiveText(value);
  }

  private maskIdentifier(row: ImportRow): string | null {
    const email = this.primitiveText(row.email);
    if (email) {
      const [name, domain] = email.split('@');
      return domain ? `${name.slice(0, 2)}***@${domain}` : '***';
    }
    const phone = this.primitiveText(row.phone).replace(/\D/g, '');
    if (phone) return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
    return this.primitiveText(row.username) || null;
  }

  private primitiveText(value: unknown): string {
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number' || typeof value === 'boolean') {
      return value.toString().trim();
    }
    if (value instanceof Date) return value.toISOString();
    return '';
  }

  private errorCode(error: unknown): string {
    if (error instanceof ConflictException) return 'CONFLICT';
    if (error instanceof BadRequestException) return 'INVALID_DATA';
    return 'IMPORT_FAILED';
  }

  private errorMessage(error: unknown): string {
    if (
      error instanceof BadRequestException ||
      error instanceof ConflictException
    ) {
      const response = error.getResponse();
      if (typeof response === 'string') return response;
      const message = (response as { message?: string | string[] }).message;
      return Array.isArray(message)
        ? message.join('；')
        : (message ?? error.message);
    }
    return '导入失败';
  }

  private rethrowPrismaError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('用户名、邮箱或手机号已存在');
    }
    throw error;
  }

  private toDto(user: AdminUserRecord): AdminUserDto {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      countryCode: user.countryCode,
      phone: user.phone,
      active: user.active,
      emailVerified: Boolean(user.emailVerifiedAt),
      phoneVerified: Boolean(user.phoneVerifiedAt),
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      profile: user.profile,
    };
  }

  private toListItemDto(user: AdminUserListRecord): AdminUserListItemDto {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      countryCode: user.countryCode,
      phone: user.phone,
      displayName: user.profile?.displayName ?? null,
      fullName: user.profile?.fullName ?? null,
      avatar: user.profile?.avatar ?? null,
      active: user.active,
      emailVerified: Boolean(user.emailVerifiedAt),
      phoneVerified: Boolean(user.phoneVerifiedAt),
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }
}
