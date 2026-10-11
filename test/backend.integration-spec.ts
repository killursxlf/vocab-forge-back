import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import type { ExecutionContext } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { WordsService } from '../src/words/words.service';
import { UsersService } from '../src/users/users.service';
import { WordSetsService } from '../src/word-sets/word-sets.service';
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
