import { Injectable } from '@nestjs/common';
import { Prisma, WordStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CardSettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings(userId: number, selectedTables?: string[]) {
    console.log('Getting settings for user:', userId, 'selectedTables:', selectedTables);
    
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
    
    
    // Определяем какие таблицы нужно загрузить
    const tablesToLoad = selectedTables || settings.selectedTables || ['all'];
    
    let wordSetsQuery;
    if (tablesToLoad.includes('all')) {
      // Загружаем все таблицы пользователя
      wordSetsQuery = {
        where: { userId },
        orderBy: { id: 'desc' as const },
      };
    } else {
      // Загружаем только выбранные таблицы
      const numericIds = tablesToLoad
        .filter(id => id !== 'all')
        .map(id => parseInt(id, 10))
        .filter(id => !isNaN(id));
      
      wordSetsQuery = {
        where: { 
          userId,
          id: { in: numericIds }
        },
        orderBy: { id: 'desc' as const },
      };
    }
    
    const wordSets = await this.prisma.wordSet.findMany(wordSetsQuery);
    console.log('Found wordSets:', wordSets.length);
    
    let userColumns = [
      { key: 'original', name: 'Слово' },
      { key: 'translation', name: 'Перевод' },
    ];
    
    if (wordSets.length > 0) {
      if (wordSets.length === 1) {
        // Одна таблица - показываем все её кастомные колонки
        console.log('Single table mode');
        const wordSet = wordSets[0];
        console.log('WordSet customColumns:', wordSet.customColumns);
        
        if (wordSet.customColumns) {
          try {
            const customColumns = wordSet.customColumns as any[];
            if (Array.isArray(customColumns) && customColumns.length > 0) {
              customColumns.forEach(col => {
                const key = col.key || col.name?.toLowerCase().replace(/\s+/g, '_');
                const name = col.name || col.key;
                if (key && name && !userColumns.find(c => c.key === key)) {
                  userColumns.push({ key, name });
                }
              });
            }
          } catch (error) {
            console.error('Error parsing custom columns for single wordSet:', wordSet.id, error);
          }
        }
      } else {
        // Несколько таблиц - находим общие колонки
        console.log('Multiple tables mode');
        const commonColumns = this.findCommonColumns(wordSets);
        console.log('Common columns found:', commonColumns.size);
        
        commonColumns.forEach((column, key) => {
          if (!userColumns.find(c => c.key === key)) {
            userColumns.push(column);
          }
        });
      }
    }
    
    console.log('Final userColumns:', userColumns);
    
    return {
      ...settings,
      userColumns
    };
  }

  private findCommonColumns(wordSets: any[]): Map<string, { key: string; name: string }> {
    console.log('Finding common columns for', wordSets.length, 'wordSets');
    
    if (wordSets.length === 0) {
      return new Map();
    }

    // Собираем все колонки из всех таблиц
    const allTableColumns: Array<Map<string, { key: string; name: string }>> = [];
    
    for (const wordSet of wordSets) {
      const tableColumns = new Map<string, { key: string; name: string }>();
      
      if (wordSet.customColumns) {
        try {
          const customColumns = wordSet.customColumns as any[];
          console.log(`WordSet ${wordSet.id} customColumns:`, customColumns);
          
          if (Array.isArray(customColumns)) {
            customColumns.forEach(col => {
              const key = col.key || col.name?.toLowerCase().replace(/\s+/g, '_');
              const name = col.name || col.key;
              if (key && name) {
                tableColumns.set(key, { key, name });
              }
            });
          }
        } catch (error) {
          console.error('Error parsing wordSet columns:', wordSet.id, error);
        }
      }
      
      allTableColumns.push(tableColumns);
      console.log(`Table ${wordSet.id} columns:`, Array.from(tableColumns.keys()));
    }
    
    // Находим пересечение: колонки, которые есть во ВСЕХ таблицах
    const commonColumns = new Map<string, { key: string; name: string }>();
    
    if (allTableColumns.length > 0) {
      // Берем первую таблицу как базу
      const firstTableColumns = allTableColumns[0];
      
      for (const [key, column] of firstTableColumns) {
        // Проверяем, есть ли эта колонка во всех остальных таблицах
        const existsInAllTables = allTableColumns.every(tableColumns => 
          tableColumns.has(key)
        );
        
        if (existsInAllTables) {
          commonColumns.set(key, column);
        }
      }
    }
    
    console.log('Common columns result:', Array.from(commonColumns.keys()));
    return commonColumns;
  }

  async updateSettings(userId: number, updateData: any) {
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

  async countWords(userId: number, filters: {
    frontKey: string,
    backKey: string,
    hintKey: string | null,
    selectedStatuses: string[],
    selectedTables: string[], 
  }) {
    const { selectedStatuses, selectedTables } = filters;
    
    const validStatuses = ['NEW', 'LEARNING', 'LEARNED'] as const;
    const filteredStatuses = selectedStatuses.filter(s =>
      validStatuses.includes(s as typeof validStatuses[number])
    ) as WordStatus[];
    
    const statusFilter = filteredStatuses.length > 0 && !selectedStatuses.includes('all')
      ? { in: filteredStatuses }
      : undefined;

    const tableFilter = selectedTables.length > 0 && !selectedTables.includes('all')
      ? { 
          in: selectedTables.map(id => parseInt(id, 10)).filter(id => !isNaN(id))
        }
      : undefined;

    const count = await this.prisma.word.count({
      where: {
        wordSet: { 
          userId: userId,
          ...(tableFilter ? { id: tableFilter } : {}), 
        },
        ...(statusFilter ? { status: statusFilter } : {}),
      },
    });

    return count;
  }

async getTrainingCards(userId: number) {
    // 1. Загружаем сохраненные настройки для этого пользователя
    const settings = await this.prisma.cardSettings.findUnique({
      where: { userId },
    });

    // Если у пользователя нет настроек, используем значения по умолчанию
    const selectedTables = settings?.selectedTables || ['all'];
    const selectedStatuses = settings?.selectedStatuses || ['all'];
    const hintKey = settings?.hintKey || null;

    // 2. Вся остальная логика остается такой же, но использует данные из settings
    const wordSetFilter: Prisma.WordSetWhereInput = {
      userId: userId,
    };

    if (selectedTables && selectedTables.length > 0 && !selectedTables.includes('all')) {
      const tableIds = selectedTables
        .map((id) => parseInt(id, 10))
        .filter((id) => !isNaN(id));

      if (tableIds.length > 0) {
        wordSetFilter.id = {
          in: tableIds,
        };
      }
    }

    const where: Prisma.WordWhereInput = {
      wordSet: wordSetFilter,
    };

    const validStatuses = ['NEW', 'LEARNING', 'LEARNED'] as const;
    const filteredStatuses = selectedStatuses.filter((s) =>
      validStatuses.includes(s as (typeof validStatuses)[number]),
    ) as WordStatus[];

    if (filteredStatuses.length > 0 && !selectedStatuses.includes('all')) {
      where.status = {
        in: filteredStatuses,
      };
    }

    const words = await this.prisma.word.findMany({ where });

    return words.map((word) => {
      if (!hintKey || !word.customFields) {
        return { ...word, customFields: null };
      }
      const fields = word.customFields as Record<string, any>;
      const hintValue = fields[hintKey];
      if (hintValue !== undefined) {
        return { ...word, customFields: { [hintKey]: hintValue } };
      } else {
        return { ...word, customFields: null };
      }
    });
  }
}