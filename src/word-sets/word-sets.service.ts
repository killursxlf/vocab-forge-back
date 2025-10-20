import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateWordSetDto } from './dto/create-word-set.dto';
import { UpdateWordSetDto } from './dto/update-word-set.dto';
import { Prisma } from '@prisma/client';

type WordStatus = 'NEW' | 'LEARNING' | 'LEARNED';

@Injectable()
export class WordSetsService {
  constructor(private prisma: PrismaService) {}

  create(createWordSetDto: CreateWordSetDto, userId: number) {
    return this.prisma.wordSet.create({
      data: {
        ...createWordSetDto,
        userId: userId,
      },
    });
  }

  findAll(userId: number) {
    return this.prisma.wordSet.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        id: 'desc',
      },
    });
  }

  async findOne(
    id: number,
    userId: number,
    offset = 0,
    limit = 100,
    search?: string,
    status?: string,
  ) {
    const wordSet = await this.prisma.wordSet.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        customColumns: true,
        userId: true,
      },
    });

    if (!wordSet || wordSet.userId !== userId) {
      throw new NotFoundException('Word set not found');
    }

    const whereClause: Prisma.WordWhereInput = {
      wordSetId: id,
    };

    if (status) {
      whereClause.status = status as WordStatus;
    }

    if (search) {
      whereClause.OR = [
        { original: { contains: search, mode: 'insensitive' } },
        { translation: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [words, totalCount] = await Promise.all([
      this.prisma.word.findMany({
        where: whereClause,
        orderBy: { createdAt: 'asc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.word.count({
        where: whereClause,
      }),
    ]);

    return {
      ...wordSet,
      words,
      total: totalCount,
      hasMore: offset + limit < totalCount,
    };
  }

  async update(id: number, updateWordSetDto: UpdateWordSetDto, userId: number) {
    await this.findOne(id, userId, 0, 0);
    return this.prisma.wordSet.update({
      where: { id },
      data: updateWordSetDto,
    });
  }

  async remove(id: number, userId: number) {
    await this.findOne(id, userId, 0, 0);
    return this.prisma.wordSet.delete({
      where: { id },
    });
  }
}
