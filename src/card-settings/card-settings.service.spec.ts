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
    word: { findMany: jest.fn() },
  };
  const service = new CardSettingsService(prisma as unknown as PrismaService);
  beforeEach(() => {
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
    expect(prisma.word.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { wordSet: { userId: 2, id: { in: [] } }, status: { in: [] } },
      }),
    );
  });
});
