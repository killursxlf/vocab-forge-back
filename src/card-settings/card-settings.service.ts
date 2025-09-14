import { Injectable } from '@nestjs/common';
import { Prisma, WordStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type UserColumn = { key: string; name: string; labelKey?: string };
type CustomColumnLike = Partial<UserColumn> & { key?: unknown; name?: unknown };

type WordSetWithColumns = Prisma.WordSetGetPayload<{
  select: { id: true; userId: true; customColumns: true };
}>;

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

function toKeyFromName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '_');
}

function normalizeCustomColumns(cols: unknown): UserColumn[] {
  if (!Array.isArray(cols)) return [];
  const result: UserColumn[] = [];
  for (const raw of cols as CustomColumnLike[]) {
    const keyRaw = raw?.key;
    const nameRaw = raw?.name;

    const name =
      isString(nameRaw) && nameRaw.trim().length > 0
        ? nameRaw.trim()
        : isString(keyRaw)
          ? keyRaw
          : undefined;

    let key: string | undefined;
    if (isString(keyRaw) && keyRaw.trim().length > 0) {
      key = keyRaw.trim();
    } else if (isString(nameRaw) && nameRaw.trim().length > 0) {
      key = toKeyFromName(nameRaw.trim());
    }

    if (key && name) {
      result.push({ key, name });
    }
  }
  return result;
}

@Injectable()
export class CardSettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings(userId: number, selectedTables?: string[]) {
    console.log(
      'Getting settings for user:',
      userId,
      'selectedTables:',
      selectedTables,
    );

    const settings = await this.prisma.cardSettings.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        frontKey: 'original',
        backKey: 'translation',
        selectedStatuses: ['all'],
        selectedTables: ['all'],
        hintKey: null,
      },
    });

    const tablesToLoad = selectedTables || settings.selectedTables || ['all'];

    let wordSetsQuery: Prisma.WordSetFindManyArgs;
    if (tablesToLoad.includes('all')) {
      wordSetsQuery = {
        where: { userId },
        orderBy: { id: 'desc' },
      };
    } else {
      const numericIds = tablesToLoad
        .filter((id) => id !== 'all')
        .map((id) => parseInt(id, 10))
        .filter((id) => !Number.isNaN(id));

      wordSetsQuery = {
        where: {
          userId,
          id: { in: numericIds },
        },
        orderBy: { id: 'desc' },
      };
    }

    const wordSets = await this.prisma.wordSet.findMany(wordSetsQuery);
    console.log('Found wordSets:', wordSets.length);

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

    if (wordSets.length > 0) {
      if (wordSets.length === 1) {
        console.log('Single table mode');
        const wordSet = wordSets[0] as WordSetWithColumns;
        console.log('WordSet customColumns:', wordSet.customColumns);

        const customCols = normalizeCustomColumns(wordSet.customColumns);
        for (const col of customCols) {
          if (!userColumns.find((c) => c.key === col.key)) {
            userColumns.push(col);
          }
        }
      } else {
        console.log('Multiple tables mode');
        const commonColumns = this.findCommonColumns(
          wordSets as WordSetWithColumns[],
        );
        console.log('Common columns found:', commonColumns.size);

        commonColumns.forEach((column, key) => {
          if (!userColumns.find((c) => c.key === key)) {
            userColumns.push(column);
          }
        });
      }
    }

    console.log('Final userColumns:', userColumns);

    return {
      ...settings,
      userColumns,
    };
  }

  private findCommonColumns(
    wordSets: WordSetWithColumns[],
  ): Map<string, UserColumn> {
    console.log('Finding common columns for', wordSets.length, 'wordSets');

    if (wordSets.length === 0) {
      return new Map();
    }

    const allTableColumns: Array<Map<string, UserColumn>> = [];

    for (const wordSet of wordSets) {
      const tableColumns = new Map<string, UserColumn>();

      const customCols = normalizeCustomColumns(wordSet.customColumns);
      console.log(`WordSet ${wordSet.id} customColumns:`, customCols);

      for (const col of customCols) {
        tableColumns.set(col.key, col);
      }

      allTableColumns.push(tableColumns);
      console.log(
        `Table ${wordSet.id} columns:`,
        Array.from(tableColumns.keys()),
      );
    }

    const commonColumns = new Map<string, UserColumn>();

    if (allTableColumns.length > 0) {
      const firstTableColumns = allTableColumns[0];

      for (const [key, column] of firstTableColumns) {
        const existsInAllTables = allTableColumns.every((tableColumns) =>
          tableColumns.has(key),
        );
        if (existsInAllTables) {
          commonColumns.set(key, column);
        }
      }
    }

    console.log('Common columns result:', Array.from(commonColumns.keys()));
    return commonColumns;
  }

  async updateSettings(
    userId: number,
    updateData: Partial<{
      frontKey: string;
      backKey: string;
      hintKey: string | null;
      selectedStatuses: string[];
      selectedTables: string[];
    }>,
  ) {
    return this.prisma.cardSettings.upsert({
      where: { userId },
      update: {
        ...updateData,
        updatedAt: new Date(),
      },
      create: {
        userId,
        frontKey: 'original',
        backKey: 'translation',
        selectedStatuses: ['all'],
        hintKey: null,
        ...updateData,
      },
    });
  }

  async countWords(
    userId: number,
    filters: {
      frontKey: string;
      backKey: string;
      hintKey: string | null;
      selectedStatuses: string[];
      selectedTables: string[];
    },
  ) {
    const { selectedStatuses, selectedTables } = filters;

    const validStatuses = ['NEW', 'LEARNING', 'LEARNED'] as const;
    const filteredStatuses = selectedStatuses.filter(
      (s): s is (typeof validStatuses)[number] =>
        (validStatuses as readonly string[]).includes(s),
    ) as WordStatus[];

    const statusFilter =
      filteredStatuses.length > 0 && !selectedStatuses.includes('all')
        ? { in: filteredStatuses }
        : undefined;

    const tableIds =
      selectedTables.length > 0 && !selectedTables.includes('all')
        ? selectedTables
            .map((id) => parseInt(id, 10))
            .filter((id) => !Number.isNaN(id))
        : undefined;

    const count = await this.prisma.word.count({
      where: {
        wordSet: {
          userId,
          ...(tableIds && tableIds.length > 0 ? { id: { in: tableIds } } : {}),
        },
        ...(statusFilter ? { status: statusFilter } : {}),
      },
    });

    return count;
  }

  async getTrainingCards(userId: number) {
    const settings = await this.prisma.cardSettings.findUnique({
      where: { userId },
    });

    const selectedTables = settings?.selectedTables || ['all'];
    const selectedStatuses = settings?.selectedStatuses || ['all'];
    const hintKey = settings?.hintKey || null;

    const wordSetFilter: Prisma.WordSetWhereInput = { userId };

    if (selectedTables.length > 0 && !selectedTables.includes('all')) {
      const tableIds = selectedTables
        .map((id) => parseInt(id, 10))
        .filter((id) => !Number.isNaN(id));

      if (tableIds.length > 0) {
        wordSetFilter.id = { in: tableIds };
      }
    }

    const where: Prisma.WordWhereInput = { wordSet: wordSetFilter };

    const validStatuses = ['NEW', 'LEARNING', 'LEARNED'] as const;
    const filteredStatuses = selectedStatuses.filter(
      (s): s is (typeof validStatuses)[number] =>
        (validStatuses as readonly string[]).includes(s),
    ) as WordStatus[];

    if (filteredStatuses.length > 0 && !selectedStatuses.includes('all')) {
      where.status = { in: filteredStatuses };
    }

    const words = await this.prisma.word.findMany({ where });

    return words.map((word) => {
      if (!hintKey || word.customFields == null) {
        return { ...word, customFields: null };
      }

      const fields = word.customFields as unknown;
      if (fields && typeof fields === 'object') {
        const rec = fields as Record<string, unknown>;
        const hintValue = rec[hintKey];
        if (hintValue !== undefined) {
          return { ...word, customFields: { [hintKey]: hintValue } };
        }
      }
      return { ...word, customFields: null };
    });
  }
}
