import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, WordStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWordDto } from './dto/create-word.dto';
import { UpdateWordDto } from './dto/update-word.dto';
import { scheduleReview } from './review-schedule';

function writableWord(dto: UpdateWordDto) {
  return {
    original: dto.original,
    translation: dto.translation,
    status: dto.status,
    customFields:
      dto.customFields === null
        ? Prisma.DbNull
        : (dto.customFields as Prisma.InputJsonValue | undefined),
    ...(dto.status !== undefined
      ? {
          learnedAt: dto.status === WordStatus.LEARNED ? new Date() : null,
          successStreak: 0,
          missStreak: 0,
          reviewBox: 0,
          nextReviewAt: new Date(),
        }
      : {}),
  };
}

@Injectable()
export class WordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async create(dto: CreateWordDto, wordSetId: number, userId: number) {
    const set = await this.prisma.wordSet.findUnique({
      where: { id: wordSetId, userId },
      select: { id: true },
    });
    if (!set) throw new NotFoundException('Word set not found');
    return this.prisma.word.create({
      data: {
        ...writableWord(dto),
        original: dto.original,
        translation: dto.translation,
        wordSetId,
      },
    });
  }

  update(id: number, dto: UpdateWordDto, userId: number) {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw`SELECT id FROM "Word" WHERE id = ${id}
        AND "wordSetId" IN (SELECT id FROM "WordSet" WHERE "userId" = ${userId}) FOR UPDATE`;
      const word = await transaction.word.findUnique({
        where: { id, wordSet: { userId } },
      });
      if (!word) throw new NotFoundException('Word not found');
      const previous =
        word.customFields &&
        typeof word.customFields === 'object' &&
        !Array.isArray(word.customFields)
          ? word.customFields
          : {};
      return transaction.word.update({
        where: { id, wordSet: { userId } },
        data: {
          ...writableWord(dto),
          ...(dto.customFields
            ? {
                customFields: {
                  ...previous,
                  ...dto.customFields,
                } as Prisma.InputJsonObject,
              }
            : {}),
        },
      });
    });
  }

  remove(id: number, userId: number) {
    return this.prisma.word.delete({ where: { id, wordSet: { userId } } });
  }

  async submitAnswer(
    wordId: number,
    knows: boolean,
    userId: number,
    answerId?: string,
  ) {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.prisma.$transaction(
          async (transaction) => {
            const word = await transaction.word.findUnique({
              where: { id: wordId, wordSet: { userId } },
            });
            if (!word) throw new NotFoundException('Word not found');
            if (answerId) {
              const previous = await transaction.reviewEvent.findUnique({
                where: { id: answerId },
              });
              if (previous) {
                if (
                  previous.wordId !== wordId ||
                  previous.userId !== userId ||
                  previous.knows !== knows
                ) {
                  throw new ConflictException('Answer ID was already used');
                }
                return word;
              }
            }
            await transaction.reviewEvent.create({
              data: { id: answerId, wordId, userId, knows },
            });
            let { status, successStreak, missStreak, learnedAt } = word;
            const now = new Date();
            if (knows) {
              successStreak++;
              missStreak = 0;
              if (status === WordStatus.NEW) status = WordStatus.LEARNING;
              if (
                successStreak >=
                  this.config.getOrThrow<number>('LEARN_STREAK_THRESHOLD') &&
                status !== WordStatus.LEARNED
              ) {
                status = WordStatus.LEARNED;
                learnedAt = now;
              }
            } else {
              successStreak = 0;
              missStreak++;
              if (
                status === WordStatus.LEARNED &&
                this.config.getOrThrow<string>('DOWNGRADE_ON_MISS') ===
                  'true' &&
                missStreak >=
                  this.config.getOrThrow<number>('DOWNGRADE_MISS_THRESHOLD')
              ) {
                status = WordStatus.LEARNING;
                learnedAt = null;
                missStreak = 0;
              }
            }
            const updated = await transaction.word.update({
              where: { id: wordId, wordSet: { userId } },
              data: {
                status,
                successStreak,
                missStreak,
                learnedAt,
                lastReviewedAt: now,
                ...scheduleReview(word.reviewBox, knows, now),
                timesSeen: { increment: 1 },
                timesCorrect: { increment: knows ? 1 : 0 },
              },
            });
            return updated;
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        if (
          !(error instanceof Prisma.PrismaClientKnownRequestError) ||
          error.code !== 'P2034' ||
          attempt >= 4
        )
          throw error;
        await new Promise((resolve) => setTimeout(resolve, 10 * (attempt + 1)));
      }
    }
  }
}
