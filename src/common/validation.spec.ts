import { ValidationPipe } from '@nestjs/common';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { UpdateWordDto } from '../words/dto/update-word.dto';
import { CardFiltersDto } from '../card-settings/dto/card-settings.dto';
import { UpdateCardSettingsDto } from '../card-settings/dto/update-card-settings.dto';
import { TrainingPageDto } from '../card-settings/dto/training-page.dto';
import { WordSetQueryDto } from '../word-sets/dto/word-set-query.dto';

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
describe('request validation', () => {
  it.each(['password', 'googleId', 'userId', 'tokenVersion'])(
    'rejects profile field %s',
    async (key) => {
      await expect(
        pipe.transform(
          { [key]: 'injected' },
          { type: 'body', metatype: UpdateUserDto },
        ),
      ).rejects.toThrow();
    },
  );
  it('rejects nested word relations and settings ownership changes', async () => {
    await expect(
      pipe.transform(
        { wordSet: { connect: { id: 2 } } },
        { type: 'body', metatype: UpdateWordDto },
      ),
    ).rejects.toThrow();
    await expect(
      pipe.transform(
        { userId: 2 },
        { type: 'body', metatype: UpdateCardSettingsDto },
      ),
    ).rejects.toThrow();
  });
  it('requires filter arrays and rejects null settings arrays', async () => {
    await expect(
      pipe.transform({}, { type: 'body', metatype: CardFiltersDto }),
    ).rejects.toThrow();
    await expect(
      pipe.transform(
        { selectedTables: null },
        { type: 'body', metatype: UpdateCardSettingsDto },
      ),
    ).rejects.toThrow();
  });
  it('accepts an explicit empty selection without weakening array validation', async () => {
    for (const metatype of [CardFiltersDto, UpdateCardSettingsDto]) {
      await expect(
        pipe.transform(
          { selectedTables: [], selectedStatuses: [] },
          { type: 'body', metatype },
        ),
      ).resolves.toMatchObject({ selectedTables: [], selectedStatuses: [] });
    }
  });
  it('requires a complete, valid review cursor while preserving offset paging', async () => {
    const afterReviewAt = '2026-10-10T12:00:00.000Z';
    await expect(
      pipe.transform(
        { afterReviewAt, afterId: '100' },
        { type: 'query', metatype: TrainingPageDto },
      ),
    ).resolves.toMatchObject({
      afterReviewAt,
      afterId: 100,
      offset: 0,
      limit: 100,
    });
    await expect(
      pipe.transform(
        { offset: '100' },
        { type: 'query', metatype: TrainingPageDto },
      ),
    ).resolves.toMatchObject({ offset: 100 });
    for (const query of [
      { afterReviewAt },
      { afterId: '100' },
      { afterReviewAt: 'bad date', afterId: '1' },
      { afterReviewAt: '2026-02-30T12:00:00.000Z', afterId: '1' },
      { afterReviewAt, afterId: '0' },
      { afterReviewAt, afterId: '2147483648' },
      { afterReviewAt, afterId: '1.5' },
      { afterReviewAt: null, afterId: '1' },
    ]) {
      await expect(
        pipe.transform(query, { type: 'query', metatype: TrainingPageDto }),
      ).rejects.toThrow();
    }
  });

  it('rejects invalid paging and enum values', async () => {
    for (const query of [
      { limit: '100000' },
      { offset: '-1' },
      { limit: 'NaN' },
      { status: 'invalid' },
    ]) {
      await expect(
        pipe.transform(query, { type: 'query', metatype: WordSetQueryDto }),
      ).rejects.toThrow();
    }
  });
});
