import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { ConfigService } from '@nestjs/config';
import type { ExecutionContext } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { WordsService } from '../src/words/words.service';
import { UsersService } from '../src/users/users.service';
import { WordSetsService } from '../src/word-sets/word-sets.service';
import { CardSettingsService } from '../src/card-settings/card-settings.service';
import { AuthRateLimitGuard } from '../src/security/auth-rate-limit.guard';

const connection = process.env.TEST_DATABASE_URL;
if (!connection)
  throw new Error(
    'Set TEST_DATABASE_URL to an isolated local database ending in _test',
  );
const url = new URL(connection);
if (
  !['localhost', '127.0.0.1'].includes(url.hostname) ||
  !url.pathname.endsWith('_test') ||
  !['postgres:', 'postgresql:'].includes(url.protocol)
) {
  throw new Error(
    'Integration tests require an isolated local PostgreSQL database ending in _test',
  );
}
process.env.DATABASE_URL = connection;

describe('PostgreSQL migrations and concurrent writes', () => {
  const first = new PrismaService();
  const second = new PrismaService();
  const config = new ConfigService({
    LEARN_STREAK_THRESHOLD: 3,
    DOWNGRADE_MISS_THRESHOLD: 3,
    DOWNGRADE_ON_MISS: 'true',
    AUTH_RATE_LIMIT: 2,
    AUTH_RATE_WINDOW_SECONDS: 60,
  });
  let userId: number;
  let wordSetId: number;
  let wordId: number;

  beforeAll(async () => {
    await Promise.all([first.$connect(), second.$connect()]);
  });
  beforeEach(async () => {
    const user = await first.user.create({
      data: {
        email:
          'integration-' + Date.now() + '-' + Math.random() + '@example.com',
      },
    });
    userId = user.id;
    const set = await first.wordSet.create({
      data: {
        title: 'Test set',
        userId,
        words: { create: { original: 'one', translation: 'один' } },
      },
      include: { words: true },
    });
    wordSetId = set.id;
    wordId = set.words[0].id;
  });
  afterEach(async () => {
    await first.user.deleteMany({ where: { id: userId } });
  });
  afterAll(async () => {
    await Promise.all([first.$disconnect(), second.$disconnect()]);
  });

  it('preserves every concurrent answer across independent clients', async () => {
    const services = [
      new WordsService(first, config),
      new WordsService(second, config),
    ];
    await Promise.all(
      Array.from({ length: 4 }, (_, index) =>
        services[index % 2].submitAnswer(wordId, true, userId),
      ),
    );
    const word = await first.word.findUniqueOrThrow({ where: { id: wordId } });
    expect(word).toMatchObject({
      timesSeen: 4,
      timesCorrect: 4,
      successStreak: 4,
      status: 'LEARNED',
    });
    expect(await first.reviewEvent.count({ where: { wordId } })).toBe(4);
  });

  it('backfills an old word without erasing progress when adding the schedule', async () => {
    const migration = readFileSync(
      'prisma/migrations/20261011150000_spaced_repetition/migration.sql',
      'utf8',
    );
    await first.$transaction(async (tx) => {
      await tx.$executeRawUnsafe('CREATE SCHEMA srs_migration_test');
      await tx.$executeRawUnsafe('SET LOCAL search_path TO srs_migration_test');
      await tx.$executeRawUnsafe(`CREATE TABLE "Word" (
        id INTEGER PRIMARY KEY, "wordSetId" INTEGER, status TEXT,
        "timesSeen" INTEGER, "timesCorrect" INTEGER, "lastReviewedAt" TIMESTAMP(3)
      )`);
      await tx.$executeRawUnsafe(`INSERT INTO "Word" VALUES
        (1, 1, 'LEARNED', 12, 8, '2026-10-01T12:00:00')`);
      for (const statement of migration
        .split(';')
        .filter((part) => part.trim())) {
        await tx.$executeRawUnsafe(statement);
      }
      const [word] = await tx.$queryRaw<
        {
          status: string;
          timesSeen: number;
          timesCorrect: number;
          lastReviewedAt: Date;
          reviewBox: number;
          nextReviewAt: Date;
        }[]
      >`SELECT * FROM "Word" WHERE id = 1`;
      expect(word).toMatchObject({
        status: 'LEARNED',
        timesSeen: 12,
        timesCorrect: 8,
        reviewBox: 0,
        lastReviewedAt: new Date('2026-10-01T12:00:00Z'),
      });
      expect(word.nextReviewAt.getTime()).toBeLessThanOrEqual(Date.now());
      await tx.$executeRawUnsafe('DROP SCHEMA srs_migration_test CASCADE');
    });
  });

  it('deduplicates concurrent retries by answer ID', async () => {
    const services = [
      new WordsService(first, config),
      new WordsService(second, config),
    ];
    const answerId = crypto.randomUUID();
    await Promise.all(
      services.map((service) =>
        service.submitAnswer(wordId, true, userId, answerId),
      ),
    );
    expect(
      await first.word.findUniqueOrThrow({ where: { id: wordId } }),
    ).toMatchObject({ timesSeen: 1, timesCorrect: 1 });
    expect(await first.reviewEvent.count({ where: { wordId } })).toBe(1);
    await expect(
      services[0].submitAnswer(wordId, false, userId, answerId),
    ).rejects.toThrow('Answer ID was already used');
  });

  it('persists the review schedule atomically and never reschedules a retried answer', async () => {
    const service = new WordsService(first, config);
    const answerId = crypto.randomUUID();
    const known = await service.submitAnswer(wordId, true, userId, answerId);
    expect(known.reviewBox).toBe(1);
    expect(known.nextReviewAt.getTime() - known.lastReviewedAt!.getTime()).toBe(
      86400000,
    );
    expect(
      await new CardSettingsService(first).getTrainingCards(userId),
    ).toEqual([]);

    const missed = await service.submitAnswer(
      wordId,
      false,
      userId,
      crypto.randomUUID(),
    );
    expect(missed.reviewBox).toBe(0);
    expect(
      missed.nextReviewAt.getTime() - missed.lastReviewedAt!.getTime(),
    ).toBe(600000);
    const retried = await service.submitAnswer(wordId, true, userId, answerId);
    expect(retried).toMatchObject({
      timesSeen: 2,
      timesCorrect: 1,
      reviewBox: 0,
      nextReviewAt: missed.nextReviewAt,
    });
    expect(await first.reviewEvent.count({ where: { wordId } })).toBe(2);

    await service.update(wordId, { status: 'NEW' }, userId);
    expect(
      (await new CardSettingsService(first).getTrainingCards(userId)).map(
        (card) => card.id,
      ),
    ).toEqual([wordId]);
  });

  it('does not skip due cards when answers reschedule the first page and its cursor row', async () => {
    const due = new Date(Date.now() - 86400000);
    await first.word.update({
      where: { id: wordId },
      data: { nextReviewAt: due },
    });
    await first.word.createMany({
      data: Array.from({ length: 200 }, (_, index) => ({
        wordSetId,
        original: 'page-' + index,
        translation: 'answer',
        nextReviewAt: due,
      })),
    });
    const service = new CardSettingsService(first);
    const firstPage = await service.getTrainingCards(userId);
    expect(firstPage).toHaveLength(100);
    const last = firstPage[firstPage.length - 1];
    const answeredIds = [firstPage[0].id, last.id];
    const answers = new WordsService(second, config);
    for (const id of answeredIds)
      await answers.submitAnswer(id, true, userId, crypto.randomUUID());
    const secondPage = await service.getTrainingCards(userId, {
      offset: 0,
      limit: 100,
      afterId: last.id,
      afterReviewAt: last.nextReviewAt.toISOString(),
    });
    expect(secondPage).toHaveLength(100);
    const secondLast = secondPage[secondPage.length - 1];
    const thirdPage = await service.getTrainingCards(userId, {
      offset: 0,
      limit: 100,
      afterId: secondLast.id,
      afterReviewAt: secondLast.nextReviewAt.toISOString(),
    });
    expect(thirdPage).toHaveLength(1);
    const expected = await first.word.findMany({
      where: { wordSetId, nextReviewAt: { lte: new Date() } },
      orderBy: [{ nextReviewAt: 'asc' }, { id: 'asc' }],
    });
    expect(
      [
        ...firstPage.filter((card) => !answeredIds.includes(card.id)),
        ...secondPage,
        ...thirdPage,
      ].map((card) => card.id),
    ).toEqual(expected.map((card) => card.id));
    expect(expected).toHaveLength(199);
    expect(
      await service.getTrainingCards(userId + 1000000, {
        offset: 0,
        limit: 100,
        afterId: last.id,
        afterReviewAt: last.nextReviewAt.toISOString(),
      }),
    ).toEqual([]);
  });

  it('selects only due cards, prioritizes overdue learned words, and reports the next review', async () => {
    const now = Date.now();
    await first.word.update({
      where: { id: wordId },
      data: { nextReviewAt: new Date(now - 60000) },
    });
    const overdue = await first.word.create({
      data: {
        wordSetId,
        original: 'overdue',
        translation: 'review',
        status: 'LEARNED',
        reviewBox: 3,
        nextReviewAt: new Date(now - 86400000),
      },
    });
    const future = await first.word.create({
      data: {
        wordSetId,
        original: 'later',
        translation: 'future',
        reviewBox: 2,
        nextReviewAt: new Date(now + 86400000),
      },
    });
    const service = new CardSettingsService(first);
    const filters = {
      frontKey: 'original',
      backKey: 'translation',
      selectedStatuses: ['all'],
      selectedTables: [String(wordSetId)],
    };
    await service.updateSettings(userId, filters);
    expect(
      (await service.getTrainingCards(userId)).map((card) => card.id),
    ).toEqual([overdue.id, wordId]);
    expect(
      (await service.getTrainingCards(userId, { offset: 1, limit: 1 })).map(
        (card) => card.id,
      ),
    ).toEqual([wordId]);
    expect(await service.getReviewSummary(userId, filters)).toEqual({
      count: 2,
      total: 3,
      nextReviewAt: future.nextReviewAt,
    });
    expect(await service.getReviewSummary(userId + 1000000, filters)).toEqual({
      count: 0,
      total: 0,
      nextReviewAt: null,
    });
    expect(
      await service.getReviewSummary(userId, {
        ...filters,
        selectedStatuses: ['NEW'],
      }),
    ).toEqual({ count: 1, total: 2, nextReviewAt: future.nextReviewAt });
  });

  it('preserves independently patched custom fields under concurrency', async () => {
    await first.word.update({
      where: { id: wordId },
      data: { customFields: { existing: 'keep' } },
    });
    await Promise.all([
      new WordsService(first, config).update(
        wordId,
        { customFields: { front: 'new' } },
        userId,
      ),
      new WordsService(second, config).update(
        wordId,
        { customFields: { back: 'new' } },
        userId,
      ),
    ]);
    expect(
      (await first.word.findUniqueOrThrow({ where: { id: wordId } }))
        .customFields,
    ).toEqual({ existing: 'keep', front: 'new', back: 'new' });
  });

  it('enforces ownership inside updates and leaves other accounts untouched', async () => {
    const service = new WordsService(first, config);
    await expect(
      service.update(wordId, { original: 'Attack' }, userId + 1000000),
    ).rejects.toThrow('Word not found');
    await expect(
      new WordSetsService(first).remove(wordSetId, userId + 1000000),
    ).rejects.toMatchObject({ code: 'P2025' });
    expect(
      (await first.word.findUniqueOrThrow({ where: { id: wordId } })).original,
    ).toBe('one');
  });

  it('counts and fetches only words with both selected sides, including zero-valued custom fields', async () => {
    const service = new CardSettingsService(first);
    const filters = {
      frontKey: 'definition',
      backKey: 'translation',
      hintKey: 'optional',
      selectedTables: [String(wordSetId)],
      selectedStatuses: ['all'],
    };
    await first.word.createMany({
      data: [
        {
          wordSetId,
          original: 'filled',
          translation: 'back',
          customFields: { definition: 'front' },
        },
        {
          wordSetId,
          original: 'zero',
          translation: 'back',
          customFields: { definition: 0 },
        },
        {
          wordSetId,
          original: 'empty',
          translation: 'back',
          customFields: { definition: '' },
        },
        {
          wordSetId,
          original: 'null',
          translation: 'back',
          customFields: { definition: null },
        },
        {
          wordSetId,
          original: 'missing',
          translation: 'back',
          customFields: {},
        },
      ],
    });
    await service.updateSettings(userId, filters);
    expect(await service.countWords(userId, filters)).toBe(2);
    const cards = await service.getTrainingCards(userId);
    expect(cards.map((card) => card.original)).toEqual(['filled', 'zero']);
    expect(await service.countWords(userId + 1000000, filters)).toBe(0);
    await service.updateSettings(userId, { ...filters, selectedTables: [] });
    expect(await service.getTrainingCards(userId)).toEqual([]);
    expect(
      await service.countWords(userId, { ...filters, selectedTables: [] }),
    ).toBe(0);
    expect(
      await service.countWords(userId, { ...filters, selectedStatuses: [] }),
    ).toBe(0);
  });

  it('cascades set deletion through words and answer history', async () => {
    await new WordsService(first, config).submitAnswer(wordId, true, userId);
    await new WordSetsService(first).remove(wordSetId, userId);
    expect(await first.word.count({ where: { wordSetId } })).toBe(0);
    expect(await first.reviewEvent.count({ where: { wordId } })).toBe(0);
  });

  it('cascades account deletion through settings, sets, words and history', async () => {
    await first.cardSettings.create({ data: { userId } });
    await new WordsService(first, config).submitAnswer(wordId, true, userId);
    await new UsersService(first).remove(userId);
    expect(await first.wordSet.count({ where: { userId } })).toBe(0);
    expect(await first.word.count({ where: { wordSetId } })).toBe(0);
    expect(await first.reviewEvent.count({ where: { userId } })).toBe(0);
    expect(await first.cardSettings.count({ where: { userId } })).toBe(0);
  });

  it('shares atomic rate limits across independent application clients', async () => {
    const keyIp = 'integration-ip-' + userId;
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ ip: keyIp }),
        getResponse: () => ({ setHeader: jest.fn() }),
      }),
    } as unknown as ExecutionContext;
    const guards = [
      new AuthRateLimitGuard(first, config),
      new AuthRateLimitGuard(second, config),
    ];
    const results = await Promise.allSettled(
      Array.from({ length: 6 }, (_, index) =>
        guards[index % 2].canActivate(context),
      ),
    );
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(2);
    expect(
      results.filter((result) => result.status === 'rejected'),
    ).toHaveLength(4);
  });

  it('revokes sessions with optimistic concurrency across replicas', async () => {
    await Promise.all([
      new UsersService(first).revokeTokens(userId, 0),
      new UsersService(second).revokeTokens(userId, 0),
    ]);
    expect(
      (await first.user.findUniqueOrThrow({ where: { id: userId } }))
        .tokenVersion,
    ).toBe(1);
  });
});
