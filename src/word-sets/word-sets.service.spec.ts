import { NotFoundException } from '@nestjs/common';
import { Prisma, WordStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WordSetsService } from './word-sets.service';

describe('word set ownership and pagination', () => {
  const prisma = {
    wordSet: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn<(args: Prisma.WordSetUpdateArgs) => Promise<unknown>>(),
      delete: jest.fn(),
    },
    word: { findMany: jest.fn(), count: jest.fn() },
  };
  const service = new WordSetsService(prisma as unknown as PrismaService);

  it('bounds collection reads and scopes them to the account', async () => {
    await service.findAll(2);
    expect(prisma.wordSet.findMany).toHaveBeenCalledWith({
      where: { userId: 2 },
      orderBy: { id: 'desc' },
      skip: 0,
      take: 100,
    });
  });

  it('rejects access to another account before reading its words', async () => {
    prisma.wordSet.findUnique.mockResolvedValue(null);
    await expect(service.findOne(1, 2)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.word.findMany).not.toHaveBeenCalled();
  });

  it('returns filtered pages with total and stable ordering', async () => {
    prisma.wordSet.findUnique.mockResolvedValue({ id: 1, userId: 2 });
    prisma.word.findMany.mockResolvedValue([{ id: 4 }]);
    prisma.word.count.mockResolvedValue(5);
    await expect(
      service.findOne(1, 2, { offset: 1, limit: 1, status: WordStatus.NEW }),
    ).resolves.toMatchObject({ total: 5, hasMore: true });
    expect(prisma.word.findMany).toHaveBeenCalledWith({
      where: { wordSetId: 1, status: WordStatus.NEW },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      skip: 1,
      take: 1,
    });
  });

  it('only writes editable fields with ownership in the mutation', async () => {
    await service.update(
      1,
      Object.assign({ title: 'Safe' }, { userId: 99 }),
      2,
    );
    expect(prisma.wordSet.update).toHaveBeenCalledWith({
      where: { id: 1, userId: 2 },
      data: { title: 'Safe', customColumns: undefined },
    });
    await service.remove(1, 2);
    expect(prisma.wordSet.delete).toHaveBeenCalledWith({
      where: { id: 1, userId: 2 },
    });
  });
});
