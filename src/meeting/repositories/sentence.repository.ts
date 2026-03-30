import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PrismaTransaction } from '@/tencent-mtg-hook/types';

@Injectable()
export class SentenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tx: PrismaTransaction,
    data: {
      sid: number;
      startTimeMs: bigint;
      endTimeMs: bigint;
      paragraphId: string;
      text: string;
    },
  ) {
    return tx.sentence.create({
      data,
    });
  }

  async createMany(
    tx: PrismaTransaction,
    sentences: Array<{
      sid: number;
      startTimeMs: bigint;
      endTimeMs: bigint;
      paragraphId: string;
      text: string;
    }>,
  ) {
    return tx.sentence.createMany({
      data: sentences,
      skipDuplicates: true,
    });
  }
}
