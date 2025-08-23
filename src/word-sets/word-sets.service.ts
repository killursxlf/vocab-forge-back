import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateWordSetDto } from './dto/create-word-set.dto';
import { UpdateWordSetDto } from './dto/update-word-set.dto';
// ✅ ИСПРАВЛЕНО: Добавлен импорт типов из Prisma Client
import { Prisma } from '@prisma/client';

// ✅ ИСПРАВЛЕНО: Определен тип WordStatus, который используется ниже
type WordStatus = 'NEW' | 'LEARNING' | 'LEARNED';

@Injectable()
export class WordSetsService {
  constructor(private prisma: PrismaService) {}

  // Create a new word set for a specific user
  create(createWordSetDto: CreateWordSetDto, userId: number) {
    return this.prisma.wordSet.create({
      data: {
        ...createWordSetDto,
        userId: userId, // Link to the user
      },
    });
  }

  // Find all word sets belonging to a specific user
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

    // ✅ ИСПРАВЛЕНО: Теперь тип Prisma.WordWhereInput известен
    const whereClause: Prisma.WordWhereInput = {
      wordSetId: id,
    };

    // Если передан статус, добавляем его в условие
    if (status) {
      whereClause.status = status as WordStatus;
    }

    // Если передан поиск, ищем совпадения в original и translation (регистронезависимо)
    if (search) {
      whereClause.OR = [
        { original: { contains: search, mode: 'insensitive' } },
        { translation: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Выполняем запросы параллельно для лучшей производительности
    const [words, totalCount] = await Promise.all([
      this.prisma.word.findMany({
        where: whereClause, // Используем созданное условие
        orderBy: { createdAt: 'asc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.word.count({
        where: whereClause, // И здесь тоже, для корректного подсчета
      }),
    ]);

    // Возвращаем total для соответствия интерфейсу фронтенда WordSetPage
    return {
      ...wordSet,
      words,
      total: totalCount,
      hasMore: offset + limit < totalCount,
    };
  }

  // Update a word set, ensuring it belongs to the user
  async update(id: number, updateWordSetDto: UpdateWordSetDto, userId: number) {
    // First, verify ownership
    await this.findOne(id, userId, 0, 0); // Передаем offset и limit для соответствия
    return this.prisma.wordSet.update({
      where: { id },
      data: updateWordSetDto,
    });
  }

  // Remove a word set, ensuring it belongs to the user
  async remove(id: number, userId: number) {
    await this.findOne(id, userId, 0, 0); // Передаем offset и limit для соответствия
    return this.prisma.wordSet.delete({
      where: { id },
    });
  }
}
