import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CardSettingsService } from './card-settings.service';

describe('card settings and training pages', () => {
  const prisma = {
    cardSettings: {
      findUnique: jest.fn(),
      upsert: jest.fn((args: Prisma.CardSettingsUpsertArgs) =>
        Promise.resolve(args),
      ),
    },
    word: {
      findMany: jest.fn<Promise<unknown[]>, [Prisma.WordFindManyArgs]>(),
      count: jest.fn<Promise<number>, [Prisma.WordCountArgs]>(),
      findFirst: jest.fn<
        Promise<{ nextReviewAt: Date } | null>,
        [Prisma.WordFindFirstArgs]
      >(),
    },
  };
  const service = new CardSettingsService(prisma as unknown as PrismaService);
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-11T12:00:00.000Z'));
    prisma.cardSettings.findUnique.mockResolvedValue({
      frontKey: 'definition',
      backKey: 'example',
      hintKey: 'hint',
      selectedTables: ['all'],
      selectedStatuses: ['all'],
    });
    prisma.word.findMany.mockResolvedValue([
      {
        id: 1,
        customFields: {
          definition: 'front',
          example: 'back',
          hint: 'hint',
          unused: 'secret',
        },
      },
    ]);
  });
  afterEach(() => jest.useRealTimers());

  it('preserves custom front, back and hint values without returning unused fields', async () => {
    const cards = await service.getTrainingCards(2);
    expect(cards[0].customFields).toEqual({
      definition: 'front',
      example: 'back',
      hint: 'hint',
    });
    expect(prisma.word.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100, skip: 0 }),
    );
  });

  it('preserves custom sides when no hint is selected', async () => {
    prisma.cardSettings.findUnique.mockResolvedValue({
      frontKey: 'definition',
      backKey: 'example',
      hintKey: null,
      selectedTables: ['all'],
      selectedStatuses: ['all'],
    });
    const cards = await service.getTrainingCards(2);
    expect(cards[0].customFields).toEqual({
      definition: 'front',
      example: 'back',
    });
  });

  it('uses identical side, ownership and status filters for counts and cards without requiring a hint', async () => {
    const filters = {
      frontKey: 'definition',
      backKey: 'example',
      hintKey: 'missing',
      selectedTables: ['all'],
      selectedStatuses: ['all'],
    };
    prisma.cardSettings.findUnique.mockResolvedValue(filters);
    await service.countWords(2, filters);
    await service.getTrainingCards(2);
    const counted = prisma.word.count.mock.calls[0][0];
    const fetched = prisma.word.findMany.mock.calls[0][0];
    expect(counted.where).toEqual(fetched.where);
    expect(counted.where).toEqual({
      wordSet: { userId: 2 },
      nextReviewAt: { lte: new Date() },
      AND: [
        { customFields: { path: ['definition'], not: Prisma.AnyNull } },
        { customFields: { path: ['definition'], not: '' } },
        { customFields: { path: ['example'], not: Prisma.AnyNull } },
        { customFields: { path: ['example'], not: '' } },
      ],
    });
  });

  it('keeps authenticated ownership in both upsert branches', async () => {
    await service.updateSettings(
      2,
      Object.assign({ frontKey: 'definition' }, { userId: 99 }),
    );
    const args = prisma.cardSettings.upsert.mock.calls[0][0];
    expect(args.where).toEqual({ userId: 2 });
    expect(args.create.userId).toBe(2);
    expect(args.update).not.toHaveProperty('userId');
  });

  it('does not broaden an invalid saved selection to all tables', async () => {
    prisma.cardSettings.findUnique.mockResolvedValue({
      selectedTables: ['invalid'],
      selectedStatuses: ['invalid'],
    });
    await service.getTrainingCards(2);
    expect(prisma.word.findMany.mock.calls[0][0].where).toMatchObject({
      wordSet: { userId: 2, id: { in: [] } },
      status: { in: [] },
    });
  });

  it('reports due, total and the earliest future review under the same filters', async () => {
    prisma.word.count.mockResolvedValueOnce(2).mockResolvedValueOnce(5);
    const nextReviewAt = new Date('2026-10-12T12:00:00.000Z');
    prisma.word.findFirst.mockResolvedValueOnce({ nextReviewAt });
    const filters = {
      frontKey: 'original',
      backKey: 'translation',
      selectedTables: ['3'],
      selectedStatuses: ['all'],
    };
    await expect(service.getReviewSummary(2, filters)).resolves.toEqual({
      count: 2,
      total: 5,
      nextReviewAt,
    });
    expect(prisma.word.count.mock.calls[0][0].where).toMatchObject({
      wordSet: { userId: 2, id: { in: [3] } },
      nextReviewAt: { lte: new Date() },
    });
    expect(prisma.word.count.mock.calls[1][0].where).not.toHaveProperty(
      'nextReviewAt',
    );
    expect(prisma.word.findFirst.mock.calls[0][0]).toMatchObject({
      where: {
        wordSet: { userId: 2, id: { in: [3] } },
        nextReviewAt: { gt: new Date() },
      },
      orderBy: [{ nextReviewAt: 'asc' }, { id: 'asc' }],
    });
  });

  it('orders due cards before newly due ones without excluding learned words', async () => {
    await service.getTrainingCards(2);
    expect(prisma.word.findMany.mock.calls[0][0]).toMatchObject({
      where: { nextReviewAt: { lte: new Date() } },
      orderBy: [{ nextReviewAt: 'asc' }, { id: 'asc' }],
    });
    expect(prisma.word.findMany.mock.calls[0][0].where).not.toHaveProperty(
      'status',
    );
  });
});
