import { PrismaService } from '../prisma/prisma.service';
export declare class CardSettingsService {
    private prisma;
    constructor(prisma: PrismaService);
    getSettings(userId: number, selectedTables?: string[]): Promise<{
        userColumns: {
            key: string;
            name: string;
        }[];
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
    updateSettings(userId: number, updateData: any): Promise<{
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
        wordSetId: number;
    } | {
        customFields: {
            [x: string]: any;
        };
        id: number;
        createdAt: Date;
        original: string;
        translation: string;
        status: import("@prisma/client").$Enums.WordStatus;
        wordSetId: number;
    })[]>;
}
