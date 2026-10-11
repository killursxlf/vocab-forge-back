import { ConfigService } from '@nestjs/config';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, WordStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WordsService } from './words.service';

describe('word ownership and progress', () => {
  const database = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    word: {
      findUnique: jest.fn(),
      update: jest.fn((args: Prisma.WordUpdateArgs) =>
        Promise.resolve(args.data),
      ),
    },
    reviewEvent: {
      findUnique: jest.fn(),
      create: jest.fn((args: Prisma.ReviewEventCreateArgs) =>
        Promise.resolve(args.data),
      ),
    },
  };
  const prisma = {
    ...database,
    $transaction: jest.fn(
      (
        callback: (transaction: typeof database) => unknown,
        options?: { isolationLevel: string },
      ) => {
        void options;
        return Promise.resolve(callback(database));
      },
    ),
  };
  const service = new WordsService(
    prisma as unknown as PrismaService,
    new ConfigService({
      LEARN_STREAK_THRESHOLD: 3,
      DOWNGRADE_MISS_THRESHOLD: 3,
      DOWNGRADE_ON_MISS: 'true',
    }),
  );
  beforeEach(() => {
    database.word.findUnique.mockResolvedValue({
      id: 1,
      status: WordStatus.LEARNING,
      successStreak: 2,
      missStreak: 0,
      learnedAt: null,
      reviewBox: 2,
      customFields: { example: 'keep', phonetic: 'old' },
    });
    database.reviewEvent.findUnique.mockResolvedValue(null);
  });

  it('applies a learned transition and stores the answer in the same serializable transaction', async () => {
    const result = await service.submitAnswer(1, true, 2);
    expect(result).toMatchObject({
      status: WordStatus.LEARNED,
      successStreak: 3,
      timesSeen: { increment: 1 },
      timesCorrect: { increment: 1 },
      reviewBox: 3,
    });
    expect(result.nextReviewAt).toEqual(
      new Date(result.lastReviewedAt!.getTime() + 7 * 86400000),
    );
    expect(prisma.$transaction.mock.calls[0][1]?.isolationLevel).toBe(
      'Serializable',
    );
    expect(database.reviewEvent.create).toHaveBeenCalledWith({
      data: { id: undefined, wordId: 1, userId: 2, knows: true },
    });
  });

  it('downgrades only after the configured number of misses', async () => {
    database.word.findUnique.mockResolvedValue({
      id: 1,
      status: WordStatus.LEARNED,
      successStreak: 3,
      missStreak: 2,
      learnedAt: new Date(),
      reviewBox: 3,
    });
    await expect(service.submitAnswer(1, false, 2)).resolves.toMatchObject({
      status: WordStatus.LEARNING,
      learnedAt: null,
      missStreak: 0,
      reviewBox: 0,
    });
  });

  it('rejects a word outside the requesting account', async () => {
    database.word.findUnique.mockResolvedValue(null);
    await expect(service.submitAnswer(1, true, 2)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(database.word.update).not.toHaveBeenCalled();
  });

  it('retries serialization conflicts but stops after five attempts', async () => {
    const error = new Prisma.PrismaClientKnownRequestError('Conflict', {
      code: 'P2034',
      clientVersion: '6.19.3',
    });
    prisma.$transaction.mockRejectedValue(error);
    await expect(service.submitAnswer(1, true, 2)).rejects.toBe(error);
    expect(prisma.$transaction).toHaveBeenCalledTimes(5);
    prisma.$transaction.mockImplementation((callback) =>
      Promise.resolve(callback(database)),
    );
  });

  it('scopes mutations to the owner and ignores injected relations', async () => {
    await service.update(
      1,
      Object.assign({ original: 'safe' }, { wordSet: { connect: { id: 99 } } }),
      2,
    );
    const args = database.word.update.mock.calls[0][0];
    expect(args.where).toEqual({ id: 1, wordSet: { userId: 2 } });
    expect(args.data).not.toHaveProperty('wordSet');
  });

  it('acknowledges a duplicate without changing progress', async () => {
    database.reviewEvent.findUnique.mockResolvedValue({
      wordId: 1,
      userId: 2,
      knows: true,
    });
    await service.submitAnswer(1, true, 2, 'duplicate');
    expect(database.word.update).not.toHaveBeenCalled();
    expect(database.reviewEvent.create).not.toHaveBeenCalled();
  });

  it('rejects an answer ID reused with different contents', async () => {
    database.reviewEvent.findUnique.mockResolvedValue({
      wordId: 1,
      userId: 2,
      knows: false,
    });
    await expect(
      service.submitAnswer(1, true, 2, 'duplicate'),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(database.word.update).not.toHaveBeenCalled();
  });

  it('does not update progress when recording the event fails', async () => {
    database.reviewEvent.create.mockRejectedValueOnce(
      new Error('Database failure'),
    );
    await expect(service.submitAnswer(1, true, 2)).rejects.toThrow(
      'Database failure',
    );
    expect(database.word.update).not.toHaveBeenCalled();
  });

  it('merges a custom field patch without erasing unrelated values', async () => {
    await service.update(1, { customFields: { phonetic: 'new' } }, 2);
    expect(database.word.update.mock.calls[0][0].data.customFields).toEqual({
      example: 'keep',
      phonetic: 'new',
    });
    expect(database.word.update.mock.calls[0][0].data).not.toHaveProperty(
      'nextReviewAt',
    );
  });

  it('resets the schedule when the user explicitly changes status', async () => {
    await service.update(1, { status: WordStatus.NEW }, 2);
    const data = database.word.update.mock.calls[0][0].data;
    expect(data.reviewBox).toBe(0);
    expect(data.nextReviewAt).toBeInstanceOf(Date);
    expect(data.successStreak).toBe(0);
  });
});
