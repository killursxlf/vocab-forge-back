import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from '../common/pagination.dto';
import { CreateWordSetDto } from './dto/create-word-set.dto';
import { UpdateWordSetDto } from './dto/update-word-set.dto';
import { WordSetQueryDto } from './dto/word-set-query.dto';

@Injectable()
export class WordSetsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateWordSetDto, userId: number) {
    return this.prisma.wordSet.create({
      data: {
        title: dto.title,
        customColumns: dto.customColumns as Prisma.InputJsonValue | undefined,
        userId,
      },
    });
  }

  findAll(userId: number, page: PaginationDto = new PaginationDto()) {
    return this.prisma.wordSet.findMany({
      where: { userId },
      orderBy: { id: 'desc' },
      skip: page.offset,
      take: page.limit,
    });
  }

  async findOne(
    id: number,
    userId: number,
    query: WordSetQueryDto = new WordSetQueryDto(),
  ) {
    const wordSet = await this.prisma.wordSet.findUnique({
      where: { id, userId },
    });
    if (!wordSet) throw new NotFoundException('Word set not found');
    const where: Prisma.WordWhereInput = {
      wordSetId: id,
      status: query.status,
      ...(query.search
        ? {
            OR: [
              { original: { contains: query.search, mode: 'insensitive' } },
              { translation: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [words, total] = await Promise.all([
      this.prisma.word.findMany({
        where,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        skip: query.offset,
        take: query.limit,
      }),
      this.prisma.word.count({ where }),
    ]);
    return {
      ...wordSet,
      words,
      total,
      hasMore: query.offset + query.limit < total,
    };
  }

  update(id: number, dto: UpdateWordSetDto, userId: number) {
    return this.prisma.wordSet.update({
      where: { id, userId },
      data: {
        title: dto.title,
        customColumns: dto.customColumns as Prisma.InputJsonValue | undefined,
      },
    });
  }

  remove(id: number, userId: number) {
    return this.prisma.wordSet.delete({ where: { id, userId } });
  }
}
