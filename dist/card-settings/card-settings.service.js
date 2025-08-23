"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CardSettingsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let CardSettingsService = class CardSettingsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getSettings(userId, selectedTables) {
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
        const tablesToLoad = selectedTables || settings.selectedTables || ['all'];
        let wordSetsQuery;
        if (tablesToLoad.includes('all')) {
            wordSetsQuery = {
                where: { userId },
                orderBy: { id: 'desc' },
            };
        }
        else {
            const numericIds = tablesToLoad
                .filter(id => id !== 'all')
                .map(id => parseInt(id, 10))
                .filter(id => !isNaN(id));
            wordSetsQuery = {
                where: {
                    userId,
                    id: { in: numericIds }
                },
                orderBy: { id: 'desc' },
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
                console.log('Single table mode');
                const wordSet = wordSets[0];
                console.log('WordSet customColumns:', wordSet.customColumns);
                if (wordSet.customColumns) {
                    try {
                        const customColumns = wordSet.customColumns;
                        if (Array.isArray(customColumns) && customColumns.length > 0) {
                            customColumns.forEach(col => {
                                const key = col.key || col.name?.toLowerCase().replace(/\s+/g, '_');
                                const name = col.name || col.key;
                                if (key && name && !userColumns.find(c => c.key === key)) {
                                    userColumns.push({ key, name });
                                }
                            });
                        }
                    }
                    catch (error) {
                        console.error('Error parsing custom columns for single wordSet:', wordSet.id, error);
                    }
                }
            }
            else {
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
    findCommonColumns(wordSets) {
        console.log('Finding common columns for', wordSets.length, 'wordSets');
        if (wordSets.length === 0) {
            return new Map();
        }
        const allTableColumns = [];
        for (const wordSet of wordSets) {
            const tableColumns = new Map();
            if (wordSet.customColumns) {
                try {
                    const customColumns = wordSet.customColumns;
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
                }
                catch (error) {
                    console.error('Error parsing wordSet columns:', wordSet.id, error);
                }
            }
            allTableColumns.push(tableColumns);
            console.log(`Table ${wordSet.id} columns:`, Array.from(tableColumns.keys()));
        }
        const commonColumns = new Map();
        if (allTableColumns.length > 0) {
            const firstTableColumns = allTableColumns[0];
            for (const [key, column] of firstTableColumns) {
                const existsInAllTables = allTableColumns.every(tableColumns => tableColumns.has(key));
                if (existsInAllTables) {
                    commonColumns.set(key, column);
                }
            }
        }
        console.log('Common columns result:', Array.from(commonColumns.keys()));
        return commonColumns;
    }
    async updateSettings(userId, updateData) {
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
    async countWords(userId, filters) {
        const { selectedStatuses, selectedTables } = filters;
        const validStatuses = ['NEW', 'LEARNING', 'LEARNED'];
        const filteredStatuses = selectedStatuses.filter(s => validStatuses.includes(s));
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
    async getTrainingCards(userId) {
        const settings = await this.prisma.cardSettings.findUnique({
            where: { userId },
        });
        const selectedTables = settings?.selectedTables || ['all'];
        const selectedStatuses = settings?.selectedStatuses || ['all'];
        const hintKey = settings?.hintKey || null;
        const wordSetFilter = {
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
        const where = {
            wordSet: wordSetFilter,
        };
        const validStatuses = ['NEW', 'LEARNING', 'LEARNED'];
        const filteredStatuses = selectedStatuses.filter((s) => validStatuses.includes(s));
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
            const fields = word.customFields;
            const hintValue = fields[hintKey];
            if (hintValue !== undefined) {
                return { ...word, customFields: { [hintKey]: hintValue } };
            }
            else {
                return { ...word, customFields: null };
            }
        });
    }
};
exports.CardSettingsService = CardSettingsService;
exports.CardSettingsService = CardSettingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CardSettingsService);
//# sourceMappingURL=card-settings.service.js.map