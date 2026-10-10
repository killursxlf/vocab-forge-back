import {
  ForbiddenException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWordDto } from './dto/create-word.dto';
import { UpdateWordDto } from './dto/update-word.dto';
import { WordStatus } from '@prisma/client';

@Injectable()
export class WordsService {
  private readonly UP = parseInt(process.env.LEARN_STREAK_THRESHOLD ?? '3', 10);
  private readonly DOWN_ENABLED =
    (process.env.DOWNGRADE_ON_MISS ?? 'true') === 'true';
  private readonly DOWN = parseInt(
    process.env.DOWNGRADE_MISS_THRESHOLD ?? '3',
    10,
  );
  constructor(private prisma: PrismaService) {}

  private async checkWordSetOwnership(wordSetId: number, userId: number) {
    const wordSet = await this.prisma.wordSet.findUnique({
      where: { id: wordSetId },
    });
    if (!wordSet || wordSet.userId !== userId) {
      throw new ForbiddenException('Access to this resource is denied');
    }
  }

  async create(
    createWordDto: CreateWordDto,
    wordSetId: number,
    userId: number,
  ) {
    await this.checkWordSetOwnership(wordSetId, userId);
    return this.prisma.word.create({
      data: {
        ...createWordDto,
        wordSetId: wordSetId,
      },
    });
  }

  async update(wordId: number, updateWordDto: UpdateWordDto, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Word" WHERE id = ${wordId} FOR UPDATE`;
      const word = await tx.word.findUnique({
        where: { id: wordId },
        include: { wordSet: { select: { userId: true } } },
      });
      if (!word) throw new NotFoundException('Word not found');
      if (word.wordSet.userId !== userId) throw new ForbiddenException();
      const previous =
        word.customFields &&
        typeof word.customFields === 'object' &&
        !Array.isArray(word.customFields)
          ? word.customFields
          : {};
      return tx.word.update({
        where: { id: wordId },
        data: {
          ...updateWordDto,
          ...(updateWordDto.customFields
            ? { customFields: { ...previous, ...updateWordDto.customFields } }
            : {}),
        },
      });
    });
  }

  async remove(wordId: number, userId: number) {
    const word = await this.prisma.word.findUnique({ where: { id: wordId } });
    if (!word) throw new NotFoundException('Word not found');

    await this.checkWordSetOwnership(word.wordSetId, userId);

    return this.prisma.word.delete({ where: { id: wordId } });
  }

  async submitAnswer(
    wordId: number,
    knows: boolean,
    userId: number,
    answerId?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Word" WHERE id = ${wordId} FOR UPDATE`;
      const now = new Date();

      const word = await tx.word.findUnique({
        where: { id: wordId },
        include: { wordSet: { select: { userId: true } } },
      });
      if (!word) throw new NotFoundException('Word not found');
      if (word.wordSet.userId !== userId) throw new ForbiddenException();
      if (answerId) {
        const previous = await tx.reviewEvent.findUnique({
          where: { id: answerId },
        });
        if (previous) {
          if (
            previous.userId !== userId ||
            previous.wordId !== wordId ||
            previous.knows !== knows
          ) {
            throw new ConflictException('Answer ID was already used');
          }
          return word;
        }
      }
      await tx.reviewEvent.create({
        data: { id: answerId, wordId, userId, knows },
      });

      let {
        status,
        successStreak,
        missStreak,
        timesSeen,
        timesCorrect,
        learnedAt,
      } = word;

      timesSeen += 1;

      if (knows) {
        timesCorrect += 1;
        successStreak += 1;
        missStreak = 0;

        if (status === WordStatus.NEW) status = WordStatus.LEARNING;

        if (successStreak >= this.UP && status !== WordStatus.LEARNED) {
          status = WordStatus.LEARNED;
          learnedAt = now;
        }
      } else {
        successStreak = 0;
        missStreak = (missStreak ?? 0) + 1;

        if (
          status === WordStatus.LEARNED &&
          this.DOWN_ENABLED &&
          missStreak >= this.DOWN
        ) {
          status = WordStatus.LEARNING;
          learnedAt = null;
          missStreak = 0;
        }
      }

      return tx.word.update({
        where: { id: wordId },
        data: {
          status,
          successStreak,
          missStreak,
          timesSeen,
          timesCorrect,
          learnedAt,
          lastReviewedAt: now,
        },
      });
    });
  }
}
