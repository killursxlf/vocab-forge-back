import { ValidationPipe } from '@nestjs/common';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { UpdateWordDto } from '../words/dto/update-word.dto';
import { CardFiltersDto } from '../card-settings/dto/card-settings.dto';
import { UpdateCardSettingsDto } from '../card-settings/dto/update-card-settings.dto';
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
