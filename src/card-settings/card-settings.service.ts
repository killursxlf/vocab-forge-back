import { Injectable } from '@nestjs/common';
import { Prisma, WordStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from '../common/pagination.dto';
import { CardFiltersDto } from './dto/card-settings.dto';
import { UpdateCardSettingsDto } from './dto/update-card-settings.dto';

type UserColumn = { key: string; name: string; labelKey?: string };

function columns(value: Prisma.JsonValue): UserColumn[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
    const name =
      typeof raw.name === 'string'
        ? raw.name.trim()
        : typeof raw.key === 'string'
          ? raw.key.trim()
          : '';
    const key =
      typeof raw.key === 'string'
        ? raw.key.trim()
        : name.toLowerCase().replace(/\s+/g, '_');
    return name && key ? [{ name, key }] : [];
  });
}

function wordFilter(
  userId: number,
  selectedTables: string[],
  selectedStatuses: string[],
  frontKey = 'original',
  backKey = 'translation',
): Prisma.WordWhereInput {
  const ids = selectedTables
    .filter((id) => /^[1-9][0-9]{0,9}$/.test(id))
    .map(Number)
    .filter((id) => id <= 2147483647);
  const statuses = selectedStatuses.filter((status): status is WordStatus =>
    Object.values(WordStatus).includes(status as WordStatus),
  );
  return {
    wordSet: {
      userId,
      ...(selectedTables.includes('all') ? {} : { id: { in: ids } }),
    },
    ...(selectedStatuses.includes('all') ? {} : { status: { in: statuses } }),
    AND: [...new Set([frontKey, backKey])].flatMap(
      (key): Prisma.WordWhereInput[] => {
        if (key === 'word' || key === 'original')
          return [{ original: { not: '' } }];
        if (key === 'translation') return [{ translation: { not: '' } }];
        return [
          { customFields: { path: [key], not: Prisma.AnyNull } },
          { customFields: { path: [key], not: '' } },
        ];
      },
    ),
  };
}

@Injectable()
export class CardSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(userId: number, selectedTables?: string[]) {
    const settings = await this.prisma.cardSettings.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        frontKey: 'original',
        backKey: 'translation',
        selectedStatuses: ['all'],
        selectedTables: ['all'],
      },
    });
    const tables = selectedTables ?? settings.selectedTables;
    const sets = await this.prisma.wordSet.findMany({
      where: {
        userId,
        ...(tables.includes('all')
          ? {}
          : {
              id: {
                in: tables
                  .filter((id) => /^[1-9][0-9]{0,9}$/.test(id))
                  .map(Number)
                  .filter((id) => id <= 2147483647),
              },
            }),
      },
      select: { id: true, customColumns: true },
      orderBy: { id: 'desc' },
    });
    const userColumns: UserColumn[] = [
      {
        key: 'original',
        name: 'Original',
        labelKey: 'cards.setup.columns.original',
      },
      {
        key: 'translation',
        name: 'Translation',
        labelKey: 'cards.setup.columns.translation',
      },
    ];
    if (sets.length) {
      const tableColumns = sets.map((set) => columns(set.customColumns));
      const common = tableColumns[0].filter((column) =>
        tableColumns.every((table) =>
          table.some((item) => item.key === column.key),
        ),
      );
      const seen = new Set(userColumns.map((column) => column.key));
      for (const column of common) {
        if (!seen.has(column.key)) {
          userColumns.push(column);
          seen.add(column.key);
        }
      }
    }
    return { ...settings, userColumns };
  }

  updateSettings(userId: number, dto: UpdateCardSettingsDto) {
    const data = {
      frontKey: dto.frontKey,
      backKey: dto.backKey,
      hintKey: dto.hintKey,
      selectedStatuses: dto.selectedStatuses,
      selectedTables: dto.selectedTables,
    };
    return this.prisma.cardSettings.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        frontKey: dto.frontKey ?? 'original',
        backKey: dto.backKey ?? 'translation',
        selectedStatuses: dto.selectedStatuses ?? ['all'],
        selectedTables: dto.selectedTables ?? ['all'],
        hintKey: dto.hintKey,
      },
    });
  }

  countWords(userId: number, filters: CardFiltersDto) {
    return this.prisma.word.count({
      where: {
        ...wordFilter(
          userId,
          filters.selectedTables,
          filters.selectedStatuses,
          filters.frontKey,
          filters.backKey,
        ),
        nextReviewAt: { lte: new Date() },
      },
    });
  }

  async getReviewSummary(userId: number, filters: CardFiltersDto) {
    const now = new Date();
    const where = wordFilter(
      userId,
      filters.selectedTables,
      filters.selectedStatuses,
      filters.frontKey,
      filters.backKey,
    );
    const [count, total, next] = await Promise.all([
      this.prisma.word.count({
        where: { ...where, nextReviewAt: { lte: now } },
      }),
      this.prisma.word.count({ where }),
      this.prisma.word.findFirst({
        where: { ...where, nextReviewAt: { gt: now } },
        orderBy: [{ nextReviewAt: 'asc' }, { id: 'asc' }],
        select: { nextReviewAt: true },
      }),
    ]);
    return { count, total, nextReviewAt: next?.nextReviewAt ?? null };
  }

  async getTrainingCards(
    userId: number,
    page: PaginationDto = new PaginationDto(),
  ) {
    const settings = await this.prisma.cardSettings.findUnique({
      where: { userId },
    });
    const words = await this.prisma.word.findMany({
      where: {
        ...wordFilter(
          userId,
          settings?.selectedTables ?? ['all'],
          settings?.selectedStatuses ?? ['all'],
          settings?.frontKey ?? 'original',
          settings?.backKey ?? 'translation',
        ),
        nextReviewAt: { lte: new Date() },
      },
      orderBy: [{ nextReviewAt: 'asc' }, { id: 'asc' }],
      skip: page.offset,
      take: page.limit,
    });
    const keys = new Set(
      [
        settings?.frontKey ?? 'original',
        settings?.backKey ?? 'translation',
        settings?.hintKey,
      ].filter((key): key is string => Boolean(key)),
    );
    return words.map((word) => {
      const fields = word.customFields;
      const selected =
        fields && typeof fields === 'object' && !Array.isArray(fields)
          ? Object.fromEntries(
              [...keys]
                .filter((key) => Object.hasOwn(fields, key))
                .map((key) => [key, fields[key]]),
            )
          : {};
      return {
        ...word,
        customFields: Object.keys(selected).length ? selected : null,
      };
    });
  }
}
