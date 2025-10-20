import { PrismaService } from '../prisma/prisma.service';
type UserColumn = {
    key: string;
    name: string;
    labelKey?: string;
};
export declare class CardSettingsService {
    private prisma;
    constructor(prisma: PrismaService);
    getSettings(userId: number, selectedTables?: string[]): Promise<{
        userColumns: UserColumn[];
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: number;
        frontKey: string;
        backKey: string;
        selectedStatuses: string[];
        selectedTables: string[];
        hintKey: string | null;
    }>;
    private findCommonColumns;
    updateSettings(userId: number, updateData: Partial<{
        frontKey: string;
        backKey: string;
        hintKey: string | null;
        selectedStatuses: string[];
        selectedTables: string[];
    }>): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: number;
        frontKey: string;
        backKey: string;
        selectedStatuses: string[];
        selectedTables: string[];
        hintKey: string | null;
    }>;
    countWords(userId: number, filters: {
        frontKey: string;
        backKey: string;
        hintKey: string | null;
        selectedStatuses: string[];
        selectedTables: string[];
    }): Promise<number>;
    getTrainingCards(userId: number): Promise<({
        customFields: null;
        id: number;
        createdAt: Date;
        original: string;
        translation: string;
        status: import("@prisma/client").$Enums.WordStatus;
        successStreak: number;
        timesSeen: number;
        timesCorrect: number;
        lastReviewedAt: Date | null;
        learnedAt: Date | null;
        missStreak: number;
        wordSetId: number;
    } | {
        customFields: {
            [x: string]: {} | null;
        };
        id: number;
        createdAt: Date;
        original: string;
        translation: string;
        status: import("@prisma/client").$Enums.WordStatus;
        successStreak: number;
        timesSeen: number;
        timesCorrect: number;
        lastReviewedAt: Date | null;
        learnedAt: Date | null;
        missStreak: number;
        wordSetId: number;
    })[]>;
}
export {};
