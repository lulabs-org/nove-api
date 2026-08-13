import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import {
  ChannelDto,
  ChannelListResponseDto,
  CreateChannelDto,
  QueryChannelDto,
  UpdateChannelDto,
} from '../dto';
import {
  ChannelRepository,
  ChannelWithOrderCount,
} from '../repositories/channel.repository';

@Injectable()
export class ChannelService {
  constructor(private readonly channelRepository: ChannelRepository) {}

  async create(dto: CreateChannelDto): Promise<ChannelDto> {
    const code = await this.generateUniqueCode();
    const channel = await this.channelRepository.create({
      name: dto.name.trim(),
      code,
      description: this.nullableString(dto.description),
      isActive: dto.isActive ?? true,
    });
    return this.toDto(channel);
  }

  async findAll(query: QueryChannelDto): Promise<ChannelListResponseDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const keyword = query.keyword?.trim();
    const where: Prisma.ChannelWhereInput = {
      ...(keyword
        ? {
            OR: [
              { name: { contains: keyword, mode: 'insensitive' as const } },
              { code: { contains: keyword, mode: 'insensitive' as const } },
              {
                description: {
                  contains: keyword,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
    };
    const sortField = query.sortField ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';
    const { items, total } = await this.channelRepository.findMany({
      skip: (page - 1) * pageSize,
      take: pageSize,
      where,
      orderBy: [{ [sortField]: sortOrder }, { id: 'asc' }],
    });

    return {
      items: items.map((channel) => this.toDto(channel)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findById(id: number): Promise<ChannelDto> {
    return this.toDto(await this.findChannel(id));
  }

  async update(id: number, dto: UpdateChannelDto): Promise<ChannelDto> {
    await this.findChannel(id);

    const channel = await this.channelRepository.update(id, {
      name: dto.name?.trim(),
      description: this.optionalNullableString(dto, 'description'),
      isActive: dto.isActive,
    });
    return this.toDto(channel);
  }

  async updateStatus(id: number, isActive: boolean): Promise<ChannelDto> {
    await this.findChannel(id);
    return this.toDto(await this.channelRepository.update(id, { isActive }));
  }

  async delete(id: number): Promise<void> {
    const channel = await this.findChannel(id);
    if (channel.orderCount > 0) {
      throw new BadRequestException(
        'Channel is referenced by orders and cannot be deleted',
      );
    }
    await this.channelRepository.delete(id);
  }

  private async findChannel(id: number): Promise<ChannelWithOrderCount> {
    const channel = await this.channelRepository.findById(id);
    if (!channel) throw new NotFoundException('Channel not found');
    return channel;
  }

  private async generateUniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = `CH_${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
      if (!(await this.channelRepository.findByCode(code))) return code;
    }
    throw new InternalServerErrorException('Unable to generate channel code');
  }

  private nullableString(value?: string | null): string | null | undefined {
    if (value === undefined) return undefined;
    return value?.trim() || null;
  }

  private optionalNullableString(
    dto: UpdateChannelDto,
    key: 'description',
  ): string | null | undefined {
    if (!Object.prototype.hasOwnProperty.call(dto, key)) return undefined;
    return this.nullableString(dto[key]);
  }

  private toDto(channel: ChannelWithOrderCount): ChannelDto {
    return {
      ...channel,
      createdAt: channel.createdAt.toISOString(),
      updatedAt: channel.updatedAt.toISOString(),
    };
  }
}
