import { ConflictException, ForbiddenException } from '@nestjs/common';
import { WordsService } from './words.service';
import { PrismaService } from '../prisma/prisma.service';

describe('WordsService answer persistence', () => {
  const answerId = '9a652b77-446a-4b73-8fa2-1d46ab1b5842';
  function fixture() {
    const word = {
      id: 1,
      wordSetId: 2,
      wordSet: { userId: 3 },
      status: 'NEW',
      timesSeen: 0,
      timesCorrect: 0,
      successStreak: 0,
      missStreak: 0,
      learnedAt: null,
      customFields: { example: 'keep', phonetic: 'old' },
    };
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 1 }]),
      word: {
        findUnique: jest.fn().mockResolvedValue(word),
        update: jest
          .fn()
          .mockImplementation(({ data }: { data: object }) =>
            Promise.resolve({ ...word, ...data }),
          ),
      },
      reviewEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: answerId }),
      },
    };
    const prisma = {
      $transaction: (callback: (client: typeof tx) => Promise<unknown>) =>
        callback(tx),
    };
    return {
      tx,
      word,
      service: new WordsService(prisma as unknown as PrismaService),
    };
  }

  it('records the ID and updates statistics inside the transaction', async () => {
    const { service, tx } = fixture();
    const updated = await service.submitAnswer(1, true, 3, answerId);
    expect(tx.$queryRaw).toHaveBeenCalled();
    expect(tx.reviewEvent.create).toHaveBeenCalledWith({
      data: { id: answerId, wordId: 1, userId: 3, knows: true },
    });
    expect(updated).toMatchObject({
      timesSeen: 1,
      timesCorrect: 1,
      successStreak: 1,
      status: 'LEARNING',
    });
  });

  it('acknowledges a repeated ID without incrementing statistics', async () => {
    const { service, tx, word } = fixture();
    tx.reviewEvent.findUnique.mockResolvedValue({
      id: answerId,
      wordId: 1,
      userId: 3,
      knows: true,
    });
    expect(await service.submitAnswer(1, true, 3, answerId)).toEqual(word);
    expect(tx.reviewEvent.create).not.toHaveBeenCalled();
    expect(tx.word.update).not.toHaveBeenCalled();
  });

  it('rejects an ID reused with another answer', async () => {
    const { service, tx } = fixture();
    tx.reviewEvent.findUnique.mockResolvedValue({
      id: answerId,
      wordId: 1,
      userId: 3,
      knows: false,
    });
    await expect(service.submitAnswer(1, true, 3, answerId)).rejects.toThrow(
      ConflictException,
    );
    expect(tx.word.update).not.toHaveBeenCalled();
  });

  it('checks ownership before acknowledging a duplicate', async () => {
    const { service, tx } = fixture();
    await expect(service.submitAnswer(1, true, 9, answerId)).rejects.toThrow(
      ForbiddenException,
    );
    expect(tx.reviewEvent.create).not.toHaveBeenCalled();
    expect(tx.word.update).not.toHaveBeenCalled();
  });

  it('does not update statistics when recording the event fails', async () => {
    const { service, tx } = fixture();
    tx.reviewEvent.create.mockRejectedValue(new Error('database failure'));
    await expect(service.submitAnswer(1, true, 3, answerId)).rejects.toThrow(
      'database failure',
    );
    expect(tx.word.update).not.toHaveBeenCalled();
  });

  it('merges a custom field patch without erasing other fields', async () => {
    const { service, tx } = fixture();
    await service.update(1, { customFields: { phonetic: 'new' } }, 3);
    expect(tx.word.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { customFields: { example: 'keep', phonetic: 'new' } },
    });
  });
});
