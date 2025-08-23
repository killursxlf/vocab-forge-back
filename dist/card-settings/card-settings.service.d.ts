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
        userId: number;
        createdAt: Date;
        frontKey: string;
        backKey: string;
        selectedStatuses: string[];
        selectedTables: string[];
        hintKey: string | null;
        updatedAt: Date;
    }>;
    private findCommonColumns;
    updateSettings(userId: number, updateData: any): Promise<{
        id: string;
        userId: number;
        createdAt: Date;
        frontKey: string;
        backKey: string;
        selectedStatuses: string[];
        selectedTables: string[];
        hintKey: string | null;
        updatedAt: Date;
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
        original: string;
        translation: string;
        status: import("@prisma/client").$Enums.WordStatus;
        createdAt: Date;
        wordSetId: number;
    } | {
        customFields: {
            [x: string]: any;
        };
        id: number;
        original: string;
        translation: string;
        status: import("@prisma/client").$Enums.WordStatus;
        createdAt: Date;
        wordSetId: number;
    })[]>;
}
